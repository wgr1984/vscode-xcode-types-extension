# 003 — Shared table model

**Status:** proposed  
**Date:** 2026-09-23

**Decision:** One `Row`/`Column` model + per-format parse/serialize adapters.

**Why:** One React table. Less UI code. Format quirks stay in parsers.

**Ceiling:** Nested plist as path-flat rows first. Nested tree UI later if needed.  
`<!-- ponytail: path-flat plist; tree UI if users choke on paths -->`