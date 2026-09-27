# Design notes (working)

Approved sections go here until formal spec (T0.5).

## §1 Architecture — approved 2026-09-23

CustomTextEditor + shared React table + 4 adapters + TextMate.
Host owns parse/serialize; webview owns table UI; document text = source of truth.

## §2 Components — approved 2026-09-23

One `TableEditorProvider` + `FormatAdapter` ×4. Shared `TableModel`. Plist path-flat. Comments: best-effort, may drop v1.

## §3 Data flow + errors — approved 2026-09-23

Full-model `edit` messages. Binary/parse/serialize → banner, no silent clobber. External doc change → re-parse → `update`.

## §4 Testing + ship — approved 2026-09-23

Adapter unit tests + fixtures. Manual F5 smoke. vsce package. No webview E2E v1.

---

# xcassets (Phase 10) — working approvals

Scope: **C + 3 + D + P**. Approach: new `CustomEditorProvider` (not table adapters).

## xcassets §1 Architecture — approved 2026-09-27

Separate `xcodeTypes.xcassets` CustomEditorProvider + catalog document (folder URI). Webview list + wells. Host: `workspace.fs`, drag-drop copy, dirty/save multi-file. JSON write: pretty stringify. Table editors unchanged.

## xcassets §2 Subtypes + UI — approved 2026-09-27

Editable: imageset, appiconset, colorset, dataset, launchimage, group. Exotic = stub. Wells from existing Contents.json slots. Drop copies file into set. No attributes inspector v1.

## xcassets §3 Data flow + errors — approved 2026-09-27

Open via command/context on folder. CustomDocument + workspace.fs. Staged edits → dirty; save flushes binaries then JSON (P). Watcher reload; dirty+disk conflict = banner. Drop/save errors → toast, keep dirty. No fancy undo v1.

## xcassets §4 Testing + ship — approved 2026-09-27

Unit: catalog walk + parse/serialize fixtures. Manual F5 drop/save. Separate webview entry OK. No TextMate for catalog v1.




