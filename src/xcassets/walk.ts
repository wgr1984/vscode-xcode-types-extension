import type { AssetKind } from './kinds'
import { kindFromFolderName } from './kinds'
import { parseContentsJson } from './jsonFormat'

export type CatalogNode = {
  id: string
  name: string
  kind: AssetKind
  relativePath: string
  children?: CatalogNode[]
  parseError?: string
  contents?: unknown
}

/** Minimal FS surface for tests and vscode.workspace.fs adapters. */
export type WalkFs = {
  readDirectory(uriPath: string): Promise<[string, 'file' | 'dir'][]>
  readFile(uriPath: string): Promise<Uint8Array>
}

function joinPath(base: string, name: string): string {
  if (!base) return name
  return base.endsWith('/') ? base + name : `${base}/${name}`
}

function decodeUtf8(bytes: Uint8Array): string {
  return new TextDecoder('utf-8').decode(bytes)
}

async function walkNode(
  absPath: string,
  relativePath: string,
  name: string,
  kind: AssetKind,
  fs: WalkFs,
): Promise<CatalogNode> {
  const node: CatalogNode = {
    id: relativePath || '.',
    name,
    kind,
    relativePath,
  }

  try {
    const contentsPath = joinPath(absPath, 'Contents.json')
    const bytes = await fs.readFile(contentsPath)
    const parsed = parseContentsJson(decodeUtf8(bytes))
    if (parsed.ok) node.contents = parsed.value
    else node.parseError = parsed.error
  } catch {
    // Contents.json optional for some kinds
  }

  if (kind === 'catalog' || kind === 'group') {
    const entries = await fs.readDirectory(absPath)
    const children: CatalogNode[] = []
    for (const [childName, type] of entries) {
      if (type !== 'dir') continue
      if (childName === '.' || childName === '..') continue
      const childRel = relativePath
        ? joinPath(relativePath, childName)
        : childName
      const childKind = kindFromFolderName(childName)
      children.push(
        await walkNode(
          joinPath(absPath, childName),
          childRel,
          childName,
          childKind,
          fs,
        ),
      )
    }
    children.sort((a, b) => a.name.localeCompare(b.name))
    node.children = children
  } else if (kind === 'exotic' || kind === 'imageset' || kind === 'appiconset' || kind === 'colorset' || kind === 'dataset' || kind === 'launchimage') {
    // leaf asset sets — no recurse into nested asset types for v1
  }

  return node
}

/** Walk a catalog rooted at `rootAbsPath` (posix-ish path string). */
export async function walkCatalogUri(
  rootAbsPath: string,
  rootName: string,
  fs: WalkFs,
): Promise<CatalogNode> {
  return walkNode(rootAbsPath, '', rootName, 'catalog', fs)
}

/** Node fs adapter for vitest against samples/. */
export async function walkCatalogFromPaths(
  rootFsPath: string,
  io: {
    readDir: (
      p: string,
    ) => Promise<Array<{ name: string; isDirectory: () => boolean }>>
    readText: (p: string) => Promise<string>
  },
): Promise<CatalogNode> {
  const pathMod = await import('node:path')
  const name = pathMod.basename(rootFsPath)
  const fs: WalkFs = {
    async readDirectory(uriPath) {
      const ents = await io.readDir(uriPath)
      return ents.map((e) => [
        e.name,
        e.isDirectory() ? 'dir' : 'file',
      ])
    },
    async readFile(uriPath) {
      const text = await io.readText(uriPath)
      return new TextEncoder().encode(text)
    },
  }
  return walkCatalogUri(rootFsPath, name, fs)
}
