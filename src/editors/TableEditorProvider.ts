import * as vscode from 'vscode'
import { getAdapter } from '../adapters/registry'
import type { Row, TableModel } from '../adapters/types'
import { getWebviewHtml } from './webviewHtml'

type WebToHost =
  | { type: 'ready' }
  | { type: 'edit'; rows: Row[] }
  | { type: 'refresh' }
  | { type: 'editRaw'; text: string }

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
    return vscode.window.registerCustomEditorProvider(
      viewType,
      new TableEditorProvider(context),
      { webviewOptions: { retainContextWhenHidden: true } },
    )
  }

  private constructor(private readonly context: vscode.ExtensionContext) {}

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

    // Own edits must not re-push parse → webview (id remount + key reorder).
    // One WorkspaceEdit can emit multiple change events — match by written text.
    const recentOwnWrites = new Set<string>()
    const ownWriteTimers = new Set<ReturnType<typeof setTimeout>>()

    const rememberOwnWrite = (text: string) => {
      recentOwnWrites.add(text)
      const t = setTimeout(() => {
        recentOwnWrites.delete(text)
        ownWriteTimers.delete(t)
      }, 1000)
      ownWriteTimers.add(t)
    }

    const send = (type: 'init' | 'update', model: TableModel) => {
      const languageId = resolveLanguageId(document)
      webviewPanel.webview.postMessage({
        type,
        model,
        text: document.getText(),
        languageId,
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
      rememberOwnWrite(text)
      const edit = new vscode.WorkspaceEdit()
      const full = new vscode.Range(
        document.positionAt(0),
        document.positionAt(document.getText().length),
      )
      edit.replace(document.uri, full, text)
      await vscode.workspace.applyEdit(edit)
    }

    const applyRaw = async (text: string) => {
      rememberOwnWrite(text)
      const edit = new vscode.WorkspaceEdit()
      const full = new vscode.Range(
        document.positionAt(0),
        document.positionAt(document.getText().length),
      )
      edit.replace(document.uri, full, text)
      await vscode.workspace.applyEdit(edit)
      // Own-write suppress skips change listener — push banner/model explicitly.
      send('update', parseDoc())
    }

    webviewPanel.webview.onDidReceiveMessage(async (msg: WebToHost) => {
      if (msg.type === 'ready') {
        send('init', parseDoc())
      } else if (msg.type === 'edit') {
        await applyRows(msg.rows)
      } else if (msg.type === 'refresh') {
        send('update', parseDoc())
      } else if (msg.type === 'editRaw') {
        await applyRaw(msg.text)
      }
    })

    const changeSub = vscode.workspace.onDidChangeTextDocument((e) => {
      if (e.document.uri.toString() !== document.uri.toString()) return
      if (recentOwnWrites.has(e.document.getText())) return
      recentOwnWrites.clear()
      send('update', parseDoc())
    })

    webviewPanel.onDidDispose(() => {
      for (const t of ownWriteTimers) clearTimeout(t)
      ownWriteTimers.clear()
      changeSub.dispose()
    })
  }
}
