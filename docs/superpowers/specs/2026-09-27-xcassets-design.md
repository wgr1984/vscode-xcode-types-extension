# xcassets Catalog Editor — Design Spec

**Date:** 2026-09-27  
**Status:** approved 2026-09-27  
**Branch / worktree:** `feature/xcassets`  
**Host:** VS Code + Cursor  
**Research:** [research/xcassets.md](../../research/xcassets.md)  
**Decision note:** [006-xcassets-editor](../../decisions/006-xcassets-editor.md)

## Goal

Xcode-like Asset Catalog editor for `.xcassets` folders: left asset list, center wells / editors, drag-drop files into sets, multi-file save.

## Scope decisions (locked)

| Code | Choice |
|------|--------|
| **C** | Xcode-like catalog UI (not Contents.json-only table) |
| **3** | Common subtypes editable day one; exotic = stub |
| **D** | Drag-drop copies binary into set folder + sets `filename` + preview |
| **P** | Write `Contents.json` via `JSON.stringify(obj, null, 2) + '\n'`; accept key-order churn |

**Editable kinds:** `.imageset`, `.appiconset`, `.colorset`, `.dataset`, `.launchimage`, groups (no `.` in name).  
**Stub kinds:** `.symbolset`, `.brandassets`, stickers, textures/mipmaps, AR, complications, Game Center, `.iconset`, etc. — list + “unsupported” detail.  
**Out of v1:** Full Attributes inspector parity (ODR tags, memory classes, …). Basic set properties (preserve vector, render as, …) shipped.  
**Out of v1:** fancy undo stack, byte-perfect Xcode JSON, workspace-wide diagnostics.

## Architecture

Does **not** use existing `FormatAdapter` / `CustomTextEditorProvider` table path.

```
activate
  → register CustomEditorProvider viewType xcodeTypes.xcassets
  → register command + explorer context “Open Asset Catalog”

open (folder URI or catalog Contents.json → parent)
  → XcassetsDocument: walk tree via workspace.fs, parse Contents.json per set
  → webview: list + detail

edit
  → webview messages → stage FS ops + in-memory model → dirty

save
  → write staged binaries then Contents.json (P)
```

Table editors (plist/strings/xcstrings/xcconfig) and raw-edit mode stay unchanged.

## Components

| Piece | Role |
|-------|------|
| `XcassetsEditorProvider` | `CustomEditorProvider` |
| `XcassetsDocument` | Catalog folder URI, model, dirty, save/revert, watcher |
| Catalog walker | Detect kind from folder extension; parse JSON; build tree |
| Webview `XcassetsApp` | Left list + center by kind (separate Vite entry or routed bundle) |
| Drop handler | Host receives bytes/name or URI; `writeFile` into set; update slot `filename` |

### UI by kind

| Kind | Center |
|------|--------|
| imageset | Appearance × scale wells; preview / drop / clear |
| appiconset | idiom+size+scale (+ appearances) wells |
| colorset | appearance × idiom rows; swatch + RGBA/hex (no file drop) |
| dataset | file wells; drop non-exec → `data[].filename` |
| launchimage | wells from existing JSON slots |
| group | select child / empty |
| exotic | unsupported stub |

Wells driven by **existing** `Contents.json` slot arrays (including empty slots without `filename`). Do not invent full Xcode slot matrices from scratch.

## Data flow + errors

1. Open via command / context on `*.xcassets`.
2. Corrupt set JSON → flag asset + banner; siblings still load.
3. Messages: `select` | `drop` | `clearSlot` | `setColor` | `addAsset` | `rename` | `deleteAsset`.
4. Save failure mid-flush → error toast, stay dirty (no false “saved”).
5. External FS change while clean → reload; while dirty → banner (save may overwrite; no merge).
6. Drop failure → toast; slot unchanged.

## Testing + ship

**Unit (vitest):** fixture `samples/demo.xcassets`; walk; parse/serialize per editable kind; clear slot; color components; kind detect.  
**Manual F5:** open, select, drop PNG, save, spot-check in Finder/Xcode.  
**Contributes:** custom editor + command + explorer context. No TextMate for catalog v1.  
**Build:** second webview entry preferred if table bundle stays lean.

## Success

1. Open sample catalog → list shows mixed kinds.  
2. Edit imageset via drop + colorset via swatch → save → disk matches model.  
3. Exotic asset selectable, not editable.  
4. Existing table formats still work.

## Non-goals (explicit)

- Full Xcode attribute inspector parity  
- actool compile / asset validation beyond JSON parse  
- Editing PNG pixels in-editor
