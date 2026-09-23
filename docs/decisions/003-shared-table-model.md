# 003 — Shared table model

**Status:** accepted  
**Date:** 2026-09-23  
**Updated:** 2026-09-23 (plist nesting)

**Decision:** One `Row`/`Column` model + per-format parse/serialize adapters.

**Why:** One React table. Less UI code. Format quirks stay in parsers.

**Ceiling (updated):** Plist nesting = path-flat rows + real nest serialize + type `<select>`. Tree UI / Add-child later if paths hurt.  
`<!-- ponytail: path-flat + nest rebuild; tree UI if users choke on paths -->`

**See:** [plist types + nesting spec](../superpowers/specs/2026-09-23-plist-types-nesting-design.md)
