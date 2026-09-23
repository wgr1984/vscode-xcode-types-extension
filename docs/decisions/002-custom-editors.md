# 002 — Custom editors

**Status:** proposed  
**Date:** 2026-09-23

**Decision:** Use VS Code `CustomTextEditorProvider` + webview table. Not notebook, not sidebar-only.

**Why:** Matches “graphical editing”. Native save/undo. Works in Cursor. One pattern × 4 formats via adapters.

**Alt rejected:** Tree view (weak editing), Notebook (overkill).