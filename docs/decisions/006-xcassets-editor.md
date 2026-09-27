# 006 — xcassets editor

**Status:** accepted  
**Date:** 2026-09-27  
**Phase:** 10

**Decisions:**
- UX = Xcode-like catalog (**C**)
- Subtypes = common set day one (**3**); exotic stub
- Files = drag-drop copy into set (**D**)
- JSON = pretty stringify, accept churn (**P**)

**Why not reuse table `CustomTextEditor`:** catalog is a folder + binaries; multi-file dirty/save.

**See:** [research/xcassets.md](../research/xcassets.md), [spec](../superpowers/specs/2026-09-27-xcassets-design.md)

