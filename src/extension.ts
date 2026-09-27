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

export function activate(context: vscode.ExtensionContext): void {
  registerAdapter(stringsAdapter)
  registerAdapter(xcconfigAdapter)
  registerAdapter(plistAdapter)
  registerAdapter(xcstringsAdapter)
  context.subscriptions.push(
    TableEditorProvider.register(context, 'xcodeTypes.table'),
    XcassetsEditorProvider.register(context),
    registerOpenXcassetsCommand(),
  )
}

export function deactivate(): void {}
