import * as vscode from 'vscode'
import type { AssetKind } from '../xcassets/kinds'
import { kindFromFolderName } from '../xcassets/kinds'
import { stringifyContentsJson } from '../xcassets/jsonFormat'
import {
  setColorComponents,
  setDataSlotFilename,
  setImageSlotFilename,
} from '../xcassets/mutations'
import {
  findNode,
  flattenAssets,
  slotsFromContents,
  type SlotInfo,
} from '../xcassets/model'
import {
  defaultContentsJson,
  folderNameFor,
} from '../xcassets/templates'
import type { CatalogNode } from '../xcassets/walk'
import { walkCatalogUri, type WalkFs } from '../xcassets/walk'
import type { AssetDetail, XcassetsViewModel } from '../webview/xcassetsTypes'

function uriPath(uri: vscode.Uri): string {
  return uri.toString()
}

function vscodeWalkFs(): WalkFs {
  return {
    async readDirectory(p) {
      const uri = vscode.Uri.parse(p)
      const ents = await vscode.workspace.fs.readDirectory(uri)
      return ents.map(([name, type]) => [
        name,
        type === vscode.FileType.Directory ? 'dir' : 'file',
      ])
    },
    async readFile(p) {
      return vscode.workspace.fs.readFile(vscode.Uri.parse(p))
    },
  }
}

function joinUri(root: vscode.Uri, relative: string): vscode.Uri {
  if (!relative || relative === '.') return root
  return vscode.Uri.joinPath(root, ...relative.split('/'))
}

export class XcassetsDocument implements vscode.CustomDocument {
  private readonly _onDidChange = new vscode.EventEmitter<{
    readonly contentChanged: boolean
  }>()
  readonly onDidChange = this._onDidChange.event

  private readonly _onDidDispose = new vscode.EventEmitter<void>()
  readonly onDidDispose = this._onDidDispose.event

  tree!: CatalogNode
  selectionId?: string
  banner?: { level: 'error' | 'info'; text: string }
  private dirty = false
  private ownWrite = false
  /** relative path from catalog root → bytes */
  private stagedFiles = new Map<string, Uint8Array>()
  /** asset id → mutated Contents.json object */
  private stagedContents = new Map<string, unknown>()
  /** relative folder path → Contents.json body for new assets */
  private stagedCreates = new Map<string, unknown>()
  /** relative folder paths to delete recursively on save */
  private stagedDeletes = new Set<string>()
  private watcher?: vscode.FileSystemWatcher

  private constructor(
    /** MUST equal the resource VS Code opened (usually `…/*.xcassets/Contents.json`). */
    readonly uri: vscode.Uri,
    readonly catalogRoot: vscode.Uri,
  ) {}

  static resolveCatalogRoot(uri: vscode.Uri): vscode.Uri {
    let cur = uri
    for (let i = 0; i < 12; i++) {
      const name = cur.path.split('/').pop() ?? ''
      if (name.endsWith('.xcassets')) return cur
      const parent = vscode.Uri.joinPath(cur, '..')
      if (parent.path === cur.path) break
      cur = parent
    }
    // Fallback: Contents.json parent
    if (uri.path.endsWith('Contents.json')) {
      return vscode.Uri.joinPath(uri, '..')
    }
    return uri
  }

  static async create(uri: vscode.Uri): Promise<XcassetsDocument> {
    const catalogRoot = XcassetsDocument.resolveCatalogRoot(uri)
    // document.uri must match the opened resource exactly — do not rewrite to folder.
    const doc = new XcassetsDocument(uri, catalogRoot)
    await doc.load()
    doc.watch()
    return doc
  }

  get isDirty(): boolean {
    return this.dirty
  }

  dispose(): void {
    this.watcher?.dispose()
    this._onDidDispose.fire()
    this._onDidChange.dispose()
    this._onDidDispose.dispose()
  }

  private markDirty(): void {
    this.dirty = true
    this._onDidChange.fire({ contentChanged: true })
  }

  private watch(): void {
    const pattern = new vscode.RelativePattern(this.catalogRoot, '**/*')
    this.watcher = vscode.workspace.createFileSystemWatcher(pattern)
    const onExt = () => {
      if (this.ownWrite) return
      if (this.dirty) {
        this.banner = {
          level: 'info',
          text: 'Disk changed while dirty — save may overwrite.',
        }
        this._onDidChange.fire({ contentChanged: false })
        return
      }
      void this.load().then(() =>
        this._onDidChange.fire({ contentChanged: true }),
      )
    }
    this.watcher.onDidChange(onExt)
    this.watcher.onDidCreate(onExt)
    this.watcher.onDidDelete(onExt)
  }

  async load(): Promise<void> {
    const name = this.catalogRoot.path.split('/').pop() ?? 'Assets.xcassets'
    this.tree = await walkCatalogUri(
      uriPath(this.catalogRoot),
      name,
      vscodeWalkFs(),
    )
    this.stagedFiles.clear()
    this.stagedContents.clear()
    this.stagedCreates.clear()
    this.stagedDeletes.clear()
    this.dirty = false
    this.banner = undefined
  }

  private effectiveContents(node: CatalogNode): unknown {
    return this.stagedContents.get(node.id) ?? node.contents
  }

  toViewModel(webview?: vscode.Webview): XcassetsViewModel {
    const assets = flattenAssets(this.tree).map((a) => ({
      id: a.id,
      name: a.name,
      kind: a.kind,
      depth: a.depth,
      editable: a.editable,
      parseError: a.parseError,
    }))
    let detail: AssetDetail | undefined
    if (this.selectionId) {
      const node = findNode(this.tree, this.selectionId)
      if (node) {
        if (node.kind === 'exotic' || node.kind === 'group' || node.kind === 'catalog') {
          detail = {
            id: node.id,
            kind: node.kind,
            slots: [],
            unsupported: node.kind === 'exotic',
          }
        } else {
          const contents = this.effectiveContents(node)
          const slots = slotsFromContents(node.kind, contents).map((s) =>
            this.slotToView(node, s, webview),
          )
          detail = { id: node.id, kind: node.kind, slots }
        }
      }
    }
    return {
      rootPath: this.catalogRoot.fsPath,
      assets,
      selectionId: this.selectionId,
      detail,
      banner: this.banner,
    }
  }

  private slotToView(
    node: CatalogNode,
    slot: SlotInfo,
    webview?: vscode.Webview,
  ) {
    let previewUri: string | undefined
    if (slot.filename && webview) {
      const fileUri = joinUri(
        this.catalogRoot,
        node.relativePath
          ? `${node.relativePath}/${slot.filename}`
          : slot.filename,
      )
      previewUri = webview.asWebviewUri(fileUri).toString()
    }
    return {
      index: slot.index,
      label: slot.label,
      filename: slot.filename,
      previewUri,
      rgba: slot.rgba,
    }
  }

  select(assetId: string): void {
    this.selectionId = assetId
  }

  private mutateContents(
    assetId: string,
    mutator: (contents: unknown) => unknown,
  ): void {
    const node = findNode(this.tree, assetId)
    if (!node) throw new Error(`Unknown asset ${assetId}`)
    const base = this.effectiveContents(node)
    if (base === undefined) throw new Error('No Contents.json')
    const next = mutator(base)
    this.stagedContents.set(assetId, next)
    node.contents = next
    this.markDirty()
  }

  clearSlot(assetId: string, slotIndex: number): void {
    const node = findNode(this.tree, assetId)
    if (!node) return
    if (node.kind === 'colorset') return
    if (node.kind === 'dataset') {
      this.mutateContents(assetId, (c) =>
        setDataSlotFilename(c, slotIndex, undefined),
      )
      return
    }
    this.mutateContents(assetId, (c) =>
      setImageSlotFilename(c, slotIndex, undefined),
    )
  }

  setColor(
    assetId: string,
    slotIndex: number,
    rgba: { red: string; green: string; blue: string; alpha: string },
  ): void {
    this.mutateContents(assetId, (c) =>
      setColorComponents(c, slotIndex, rgba),
    )
  }

  applyDrop(
    assetId: string,
    slotIndex: number,
    fileName: string,
    bytes: Uint8Array,
  ): void {
    const node = findNode(this.tree, assetId)
    if (!node) throw new Error(`Unknown asset ${assetId}`)
    const safeName = fileName.replace(/[/\\]/g, '_')
    const rel = node.relativePath
      ? `${node.relativePath}/${safeName}`
      : safeName
    this.stagedFiles.set(rel, bytes)
    if (node.kind === 'dataset') {
      this.mutateContents(assetId, (c) =>
        setDataSlotFilename(c, slotIndex, safeName),
      )
    } else {
      this.mutateContents(assetId, (c) =>
        setImageSlotFilename(c, slotIndex, safeName),
      )
    }
  }

  addAsset(parentId: string, kind: string, name: string): void {
    const editable: AssetKind[] = [
      'imageset',
      'appiconset',
      'colorset',
      'dataset',
      'launchimage',
      'group',
    ]
    if (!editable.includes(kind as AssetKind)) {
      throw new Error(`Cannot add kind ${kind}`)
    }
    const k = kind as AssetKind
    const parent =
      parentId === '.' || parentId === ''
        ? this.tree
        : findNode(this.tree, parentId)
    if (!parent || (parent.kind !== 'catalog' && parent.kind !== 'group')) {
      throw new Error('Parent must be catalog or group')
    }
    const folder = folderNameFor(k, name)
    const rel = parent.relativePath
      ? `${parent.relativePath}/${folder}`
      : folder
    if (findNode(this.tree, rel)) throw new Error('Asset already exists')
    const contents = defaultContentsJson(k)
    this.stagedCreates.set(rel, contents)
    const child: CatalogNode = {
      id: rel,
      name: folder,
      kind: kindFromFolderName(folder),
      relativePath: rel,
      contents,
      children: k === 'group' ? [] : undefined,
    }
    parent.children = [...(parent.children ?? []), child].sort((a, b) =>
      a.name.localeCompare(b.name),
    )
    this.selectionId = rel
    this.markDirty()
  }

  deleteAsset(assetId: string): void {
    if (assetId === '.' || !assetId) throw new Error('Cannot delete catalog root')
    const node = findNode(this.tree, assetId)
    if (!node) throw new Error('Unknown asset')
    this.stagedDeletes.add(node.relativePath)
    this.stagedContents.delete(assetId)
    this.stagedCreates.delete(node.relativePath)
    const removeFrom = (parent: CatalogNode): boolean => {
      const kids = parent.children
      if (!kids) return false
      const idx = kids.findIndex((c) => c.id === assetId)
      if (idx >= 0) {
        kids.splice(idx, 1)
        return true
      }
      return kids.some((c) => removeFrom(c))
    }
    removeFrom(this.tree)
    if (this.selectionId === assetId) this.selectionId = undefined
    this.markDirty()
  }

  async save(): Promise<void> {
    this.ownWrite = true
    try {
      for (const [rel, contents] of this.stagedCreates) {
        const dir = joinUri(this.catalogRoot, rel)
        await vscode.workspace.fs.createDirectory(dir)
        await vscode.workspace.fs.writeFile(
          vscode.Uri.joinPath(dir, 'Contents.json'),
          new TextEncoder().encode(stringifyContentsJson(contents)),
        )
      }
      for (const [rel, bytes] of this.stagedFiles) {
        const target = joinUri(this.catalogRoot, rel)
        await vscode.workspace.fs.writeFile(target, bytes)
      }
      for (const [assetId, contents] of this.stagedContents) {
        const node = findNode(this.tree, assetId)
        if (!node) continue
        const jsonUri = joinUri(
          this.catalogRoot,
          node.relativePath
            ? `${node.relativePath}/Contents.json`
            : 'Contents.json',
        )
        const text = stringifyContentsJson(contents)
        await vscode.workspace.fs.writeFile(
          jsonUri,
          new TextEncoder().encode(text),
        )
      }
      for (const rel of this.stagedDeletes) {
        await vscode.workspace.fs.delete(joinUri(this.catalogRoot, rel), {
          recursive: true,
          useTrash: true,
        })
      }
      this.stagedFiles.clear()
      this.stagedContents.clear()
      this.stagedCreates.clear()
      this.stagedDeletes.clear()
      this.dirty = false
      this.banner = undefined
    } finally {
      setTimeout(() => {
        this.ownWrite = false
      }, 500)
    }
  }

  async revert(): Promise<void> {
    await this.load()
    this._onDidChange.fire({ contentChanged: true })
  }
}
