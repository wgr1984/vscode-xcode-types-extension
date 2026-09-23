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
