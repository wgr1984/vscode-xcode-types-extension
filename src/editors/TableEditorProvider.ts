import * as vscode from 'vscode'
import { getAdapter } from '../adapters/registry'
import type { Row, TableModel } from '../adapters/types'
import { getWebviewHtml } from './webviewHtml'

type WebToHost =
  | { type: 'ready' }
  | { type: 'edit'; rows: Row[] }
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

    let applying = false

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
      applying = true
      const edit = new vscode.WorkspaceEdit()
      const full = new vscode.Range(
        document.positionAt(0),
        document.positionAt(document.getText().length),
      )
      edit.replace(document.uri, full, text)
      await vscode.workspace.applyEdit(edit)
      applying = false
    }

    const applyRaw = async (text: string) => {
      applying = true
      const edit = new vscode.WorkspaceEdit()
      const full = new vscode.Range(
        document.positionAt(0),
        document.positionAt(document.getText().length),
      )
      edit.replace(document.uri, full, text)
      await vscode.workspace.applyEdit(edit)
      applying = false
      send('update', parseDoc())
    }

    webviewPanel.webview.onDidReceiveMessage(async (msg: WebToHost) => {
      if (msg.type === 'ready') {
        send('init', parseDoc())
      } else if (msg.type === 'edit') {
        await applyRows(msg.rows)
      } else if (msg.type === 'editRaw') {
        await applyRaw(msg.text)
      }
    })

    const changeSub = vscode.workspace.onDidChangeTextDocument((e) => {
      if (e.document.uri.toString() !== document.uri.toString()) return
      if (applying) return
      send('update', parseDoc())
    })

    webviewPanel.onDidDispose(() => changeSub.dispose())
  }
}
