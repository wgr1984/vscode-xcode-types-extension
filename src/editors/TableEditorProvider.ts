import * as vscode from 'vscode'
import { getAdapter } from '../adapters/registry'
import type { Row, TableModel } from '../adapters/types'
import { forgetHistory, historyFor, planMove, pushEdit } from './textHistory'
import { getWebviewHtml } from './webviewHtml'

type WebToHost =
  | { type: 'ready' }
  | { type: 'edit'; rows: Row[]; gen: number }
  | { type: 'refresh' }
  | { type: 'editRaw'; text: string; gen: number }
  | { type: 'undo' }
  | { type: 'redo' }

const EXT_TO_LANG: Record<string, string> = {
  '.plist': 'plist',
  '.strings': 'strings',
  '.xcstrings': 'xcstrings',
  '.xcconfig': 'xcconfig',
}

function resolveLanguageId(document: vscode.TextDocument): string {
  const ext = document.uri.path.slice(document.uri.path.lastIndexOf('.')).toLowerCase()
  return EXT_TO_LANG[ext] ?? document.languageId
}

export class TableEditorProvider implements vscode.CustomTextEditorProvider {
  static register(
    context: vscode.ExtensionContext,
    viewType: string,
  ): vscode.Disposable {
    const diagnostics = vscode.languages.createDiagnosticCollection('xcodeTypes')
    context.subscriptions.push(
      diagnostics,
      vscode.workspace.onDidCloseTextDocument((doc) => {
        forgetHistory(doc.uri.toString())
      }),
    )
    return vscode.window.registerCustomEditorProvider(
      viewType,
      new TableEditorProvider(context, diagnostics),
      { webviewOptions: { retainContextWhenHidden: true } },
    )
  }

  private constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly diagnostics: vscode.DiagnosticCollection,
  ) {}

  async resolveCustomTextEditor(
    document: vscode.TextDocument,
    webviewPanel: vscode.WebviewPanel,
    _token: vscode.CancellationToken,
  ): Promise<void> {
    webviewPanel.webview.options = {
      enableScripts: true,
      localResourceRoots: [
        vscode.Uri.joinPath(this.context.extensionUri, 'dist', 'webview'),
      ],
    }
    webviewPanel.webview.html = getWebviewHtml(
      webviewPanel.webview,
      this.context.extensionUri,
    )

    // Own-write echo gate by content (large paste applyEdit can finish >100ms).
    const recentOwn = new Map<string, ReturnType<typeof setTimeout>>()
    const history = historyFor(document.uri.toString(), document.getText())
    const { undo: undoStack, redo: redoStack } = history
    // Bump on every host→webview sync; stale edit/editRaw dropped.
    let gen = 0
    let queue: Promise<void> = Promise.resolve()
    const enqueue = (fn: () => Promise<void>) => {
      queue = queue.then(fn, fn)
    }

    const rememberOwn = (text: string) => {
      const prev = recentOwn.get(text)
      if (prev) clearTimeout(prev)
      recentOwn.set(
        text,
        setTimeout(() => recentOwn.delete(text), 2000),
      )
    }

    const syncDiagnostics = (model: TableModel) => {
      const issues = model.issues ?? []
      if (issues.length === 0) {
        this.diagnostics.delete(document.uri)
        return
      }
      const diags = issues.map((issue) => {
        const lineText =
          document.lineAt(Math.min(issue.line, document.lineCount - 1)).text
        const startCol = issue.startCol ?? 0
        const endCol = issue.endCol ?? lineText.length
        const range = new vscode.Range(
          issue.line,
          Math.min(startCol, lineText.length),
          issue.line,
          Math.min(endCol, lineText.length),
        )
        return new vscode.Diagnostic(
          range,
          issue.message,
          vscode.DiagnosticSeverity.Error,
        )
      })
      this.diagnostics.set(document.uri, diags)
    }

    const send = (type: 'init' | 'update', model: TableModel) => {
      gen += 1
      const languageId = resolveLanguageId(document)
      syncDiagnostics(model)
      webviewPanel.webview.postMessage({
        type,
        model,
        text: document.getText(),
        languageId,
        gen,
      })
    }

    const parseDoc = (): TableModel => {
      const languageId = resolveLanguageId(document)
      const adapter = getAdapter(languageId)
      if (!adapter) {
        return {
          columns: [],
          rows: [],
          banner: {
            level: 'error',
            text: `Unsupported language: ${languageId}`,
          },
        }
      }
      return adapter.parse(document.getText())
    }

    const replaceDoc = async (text: string): Promise<boolean> => {
      if (text === document.getText()) return false
      rememberOwn(text)
      const edit = new vscode.WorkspaceEdit()
      const full = new vscode.Range(
        document.positionAt(0),
        document.positionAt(document.getText().length),
      )
      edit.replace(document.uri, full, text)
      const ok = await vscode.workspace.applyEdit(edit)
      if (ok) history.tip = document.getText()
      return ok
    }

    const commitEdit = async (text: string): Promise<boolean> => {
      const prev = document.getText()
      if (text === prev) return false
      const ok = await replaceDoc(text)
      if (!ok) return false
      pushEdit(undoStack, redoStack, prev)
      return true
    }

    const applyRows = async (rows: Row[]) => {
      const languageId = resolveLanguageId(document)
      const adapter = getAdapter(languageId)
      if (!adapter) return
      const current = parseDoc()
      if (current.banner?.level === 'error' && current.rows.length === 0) {
        return
      }
      let text: string
      try {
        text = adapter.serialize({ ...current, rows })
      } catch (e) {
        void vscode.window.showErrorMessage(
          `Serialize failed: ${e instanceof Error ? e.message : String(e)}`,
        )
        return
      }
      await commitEdit(text)
    }

    const applyRaw = async (text: string) => {
      const ok = await commitEdit(text)
      if (ok) send('update', parseDoc())
    }

    const runMirrorHistory = async (command: 'undo' | 'redo') => {
      const current = document.getText()
      const plan =
        command === 'undo'
          ? planMove(undoStack, redoStack, current)
          : planMove(redoStack, undoStack, current)
      if (!plan) return
      const ok = await replaceDoc(plan.next)
      if (!ok) return
      plan.commit()
      send('update', parseDoc())
    }

    webviewPanel.webview.onDidReceiveMessage((msg: WebToHost) => {
      if (msg.type === 'ready') {
        send('init', parseDoc())
        return
      }
      if (msg.type === 'refresh') {
        send('update', parseDoc())
        return
      }
      void enqueue(async () => {
        if (msg.type === 'edit') {
          if (msg.gen !== gen) return // stale (e.g. after undo)
          await applyRows(msg.rows)
        } else if (msg.type === 'editRaw') {
          if (msg.gen !== gen) return
          await applyRaw(msg.text)
        } else if (msg.type === 'undo') {
          await runMirrorHistory('undo')
        } else if (msg.type === 'redo') {
          await runMirrorHistory('redo')
        }
      })
    })

    const changeSub = vscode.workspace.onDidChangeTextDocument((e) => {
      if (e.document.uri.toString() !== document.uri.toString()) return
      if (
        e.reason === vscode.TextDocumentChangeReason.Undo ||
        e.reason === vscode.TextDocumentChangeReason.Redo
      ) {
        undoStack.length = 0
        redoStack.length = 0
        history.tip = document.getText()
        send('update', parseDoc())
        return
      }
      const cur = e.document.getText()
      if (recentOwn.has(cur)) return
      // Still settling a write — do not wipe history.
      if (recentOwn.size > 0) return
      undoStack.length = 0
      redoStack.length = 0
      history.tip = document.getText()
      send('update', parseDoc())
    })

    webviewPanel.onDidDispose(() => {
      for (const t of recentOwn.values()) clearTimeout(t)
      recentOwn.clear()
      this.diagnostics.delete(document.uri)
      changeSub.dispose()
    })
  }
}
