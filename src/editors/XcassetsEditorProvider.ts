import * as vscode from 'vscode'
import type { WebToHost } from '../webview/xcassetsTypes'
import { XcassetsDocument } from './XcassetsDocument'
import { getXcassetsWebviewHtml } from './xcassetsWebviewHtml'

export class XcassetsEditorProvider implements vscode.CustomEditorProvider<XcassetsDocument> {
  static readonly viewType = 'xcodeTypes.xcassets'

  private readonly _onDidChangeCustomDocument =
    new vscode.EventEmitter<vscode.CustomDocumentEditEvent<XcassetsDocument>>()
  readonly onDidChangeCustomDocument = this._onDidChangeCustomDocument.event

  static register(context: vscode.ExtensionContext): vscode.Disposable {
    const provider = new XcassetsEditorProvider(context)
    return vscode.window.registerCustomEditorProvider(
      XcassetsEditorProvider.viewType,
      provider,
      {
        webviewOptions: { retainContextWhenHidden: true },
        supportsMultipleEditorsPerDocument: false,
      },
    )
  }

  private constructor(private readonly context: vscode.ExtensionContext) {}

  async openCustomDocument(
    uri: vscode.Uri,
    _openContext: vscode.CustomDocumentOpenContext,
    _token: vscode.CancellationToken,
  ): Promise<XcassetsDocument> {
    const doc = await XcassetsDocument.create(uri)
    const sub = doc.onDidChange(() => {
      if (doc.isDirty) {
        this._onDidChangeCustomDocument.fire({
          document: doc,
          undo: () => {},
          redo: () => {},
        })
      }
    })
    doc.onDidDispose(() => sub.dispose())
    return doc
  }

  async resolveCustomEditor(
    document: XcassetsDocument,
    webviewPanel: vscode.WebviewPanel,
    _token: vscode.CancellationToken,
  ): Promise<void> {
    webviewPanel.webview.options = {
      enableScripts: true,
      localResourceRoots: [
        vscode.Uri.joinPath(this.context.extensionUri, 'dist', 'webview'),
        document.uri,
      ],
    }
    webviewPanel.webview.html = getXcassetsWebviewHtml(
      webviewPanel.webview,
      this.context.extensionUri,
    )

    const push = (type: 'init' | 'update') => {
      webviewPanel.webview.postMessage({
        type,
        model: document.toViewModel(webviewPanel.webview),
      })
    }

    const changeSub = document.onDidChange(() => push('update'))

    webviewPanel.webview.onDidReceiveMessage(async (msg: WebToHost) => {
      try {
        if (msg.type === 'ready') {
          push('init')
        } else if (msg.type === 'select') {
          document.select(msg.assetId)
          push('update')
        } else if (msg.type === 'clearSlot') {
          document.clearSlot(msg.assetId, msg.slotIndex)
          push('update')
        } else if (msg.type === 'setColor') {
          document.setColor(msg.assetId, msg.slotIndex, msg.rgba)
          push('update')
        } else if (msg.type === 'drop') {
          const bytes = new Uint8Array(Buffer.from(msg.bytesBase64, 'base64'))
          document.applyDrop(msg.assetId, msg.slotIndex, msg.fileName, bytes)
          push('update')
        } else if (msg.type === 'addAsset') {
          document.addAsset(msg.parentId, msg.kind, msg.name)
          push('update')
        } else if (msg.type === 'deleteAsset') {
          document.deleteAsset(msg.assetId)
          push('update')
        }
      } catch (e) {
        void vscode.window.showErrorMessage(
          `xcassets: ${e instanceof Error ? e.message : String(e)}`,
        )
      }
    })

    webviewPanel.onDidDispose(() => changeSub.dispose())
  }

  async saveCustomDocument(
    document: XcassetsDocument,
    _cancellation: vscode.CancellationToken,
  ): Promise<void> {
    try {
      await document.save()
    } catch (e) {
      void vscode.window.showErrorMessage(
        `Save failed: ${e instanceof Error ? e.message : String(e)}`,
      )
      throw e
    }
  }

  async revertCustomDocument(
    document: XcassetsDocument,
    _cancellation: vscode.CancellationToken,
  ): Promise<void> {
    await document.revert()
  }

  async saveCustomDocumentAs(
    _document: XcassetsDocument,
    _destination: vscode.Uri,
    _cancellation: vscode.CancellationToken,
  ): Promise<void> {
    throw new Error('Save As not supported for asset catalogs')
  }

  async backupCustomDocument(
    document: XcassetsDocument,
    context: vscode.CustomDocumentBackupContext,
    _cancellation: vscode.CancellationToken,
  ): Promise<vscode.CustomDocumentBackup> {
    return {
      id: context.destination.toString(),
      delete: () => {},
    }
  }
}

export function registerOpenXcassetsCommand(): vscode.Disposable {
  return vscode.commands.registerCommand(
    'xcodeTypes.openXcassets',
    async (uri?: vscode.Uri) => {
      const target =
        uri ??
        vscode.window.activeTextEditor?.document.uri ??
        (await vscode.window.showOpenDialog({
          canSelectFolders: true,
          canSelectFiles: false,
          openLabel: 'Open Asset Catalog',
        }))?.[0]
      if (!target) return
      let catalog = target
      if (!catalog.path.endsWith('.xcassets')) {
        void vscode.window.showErrorMessage('Select a .xcassets folder')
        return
      }
      await vscode.commands.executeCommand(
        'vscode.openWith',
        catalog,
        XcassetsEditorProvider.viewType,
      )
    },
  )
}
