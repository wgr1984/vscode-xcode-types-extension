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
    try {
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
    } catch (e) {
      console.error('xcassets openCustomDocument failed', uri.toString(), e)
      throw e
    }
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
        document.catalogRoot,
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
          const folder = document.uriForAsset(msg.assetId)
          if (folder) {
            await vscode.commands.executeCommand('revealInExplorer', folder)
          }
        } else if (msg.type === 'selectSlot') {
          document.selectSlot(msg.assetId, msg.slotIndex)
          push('update')
        } else if (msg.type === 'clearSlot') {
          document.clearSlot(msg.assetId, msg.slotIndex)
          push('update')
        } else if (msg.type === 'setColor') {
          document.setColor(msg.assetId, msg.slotIndex, msg.rgba)
          push('update')
        } else if (msg.type === 'setProperty') {
          document.setProperty(msg.assetId, msg.key, msg.value)
          push('update')
        } else if (msg.type === 'setGrid') {
          document.setGrid(msg.assetId, msg.grid)
          push('update')
        } else if (msg.type === 'setSlotProperty') {
          document.setSlotProperty(
            msg.assetId,
            msg.slotIndex,
            msg.key,
            msg.value,
          )
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

/** Walk up from a URI to the enclosing `.xcassets` folder. */
export function resolveCatalogUri(uri: vscode.Uri): vscode.Uri | undefined {
  let cur = uri
  for (let i = 0; i < 12; i++) {
    const name = cur.path.split('/').pop() ?? ''
    if (name.endsWith('.xcassets')) return cur
    const parent = vscode.Uri.joinPath(cur, '..')
    if (parent.path === cur.path) break
    cur = parent
  }
  return undefined
}

/** Explorer keybindings often omit the URI — copy path briefly. */
async function uriFromExplorerFocus(): Promise<vscode.Uri | undefined> {
  const previous = await vscode.env.clipboard.readText()
  try {
    await vscode.commands.executeCommand('copyFilePath')
    const text = (await vscode.env.clipboard.readText()).trim()
    if (!text || text === previous.trim()) return undefined
    return vscode.Uri.file(text)
  } catch {
    return undefined
  } finally {
    await vscode.env.clipboard.writeText(previous)
  }
}

export function registerOpenXcassetsCommand(): vscode.Disposable {
  return vscode.commands.registerCommand(
    'xcodeTypes.openXcassets',
    async (uri?: vscode.Uri) => {
      const target =
        uri ??
        (await uriFromExplorerFocus()) ??
        vscode.window.activeTextEditor?.document.uri ??
        (await vscode.window.showOpenDialog({
          canSelectFolders: true,
          canSelectFiles: false,
          openLabel: 'Open Asset Catalog',
        }))?.[0]
      if (!target) return
      const catalog = resolveCatalogUri(target)
      if (!catalog) {
        void vscode.window.showErrorMessage('Select a .xcassets folder')
        return
      }
      // Always open root Contents.json — document.uri must stay that file resource.
      const contents = vscode.Uri.joinPath(catalog, 'Contents.json')
      await vscode.commands.executeCommand(
        'vscode.openWith',
        contents,
        XcassetsEditorProvider.viewType,
      )
    },
  )
}
