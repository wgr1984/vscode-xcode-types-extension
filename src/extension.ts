import * as vscode from 'vscode'
import { registerAdapter } from './adapters/registry'
import { plistAdapter } from './adapters/plist'
import { stringsAdapter } from './adapters/strings'
import { xcconfigAdapter } from './adapters/xcconfig'
import { xcstringsAdapter } from './adapters/xcstrings'
import { TableEditorProvider } from './editors/TableEditorProvider'
import {
  registerOpenXcassetsCommand,
  XcassetsEditorProvider,
} from './editors/XcassetsEditorProvider'

/** Catalog root Contents.json only (not *.imageset/Contents.json). */
function isXcassetsRootContentsJson(uri: vscode.Uri): boolean {
  return /\.xcassets\/Contents\.json$/i.test(uri.path)
}

function registerXcassetsAutoOpen(): vscode.Disposable {
  const reopening = new Set<string>()
  const reopen = async (uri: vscode.Uri) => {
    if (uri.scheme !== 'file' && uri.scheme !== 'vscode-vfs') return
    if (!isXcassetsRootContentsJson(uri)) return
    const key = uri.toString()
    if (reopening.has(key)) return
    reopening.add(key)
    try {
      await vscode.commands.executeCommand(
        'vscode.openWith',
        uri,
        XcassetsEditorProvider.viewType,
      )
    } finally {
      setTimeout(() => reopening.delete(key), 1500)
    }
  }
  return vscode.workspace.onDidOpenTextDocument((doc) => {
    void reopen(doc.uri)
  })
}

export function activate(context: vscode.ExtensionContext): void {
  registerAdapter(stringsAdapter)
  registerAdapter(xcconfigAdapter)
  registerAdapter(plistAdapter)
  registerAdapter(xcstringsAdapter)
  context.subscriptions.push(
    TableEditorProvider.register(context, 'xcodeTypes.table'),
    XcassetsEditorProvider.register(context),
    registerOpenXcassetsCommand(),
    registerXcassetsAutoOpen(),
  )
}

export function deactivate(): void {}
