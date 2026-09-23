# 005 — Binary plist

**Status:** accepted  
**Date:** 2026-09-23

**Decision:** Detect binary `.plist` → show error banner in custom editor. No edit until file is XML.

**Why:** User pick A. No silent rewrite, no `plutil` dependency in v1.

**Behavior:** Banner text points user to convert externally (e.g. `plutil -convert xml1`). Text “Open With” still possible for raw bytes.
