# 001 — Tech stack

**Status:** proposed  
**Date:** 2026-09-23

**Decision:** TypeScript + Vite + React/Tailwind (webview only) + TextMate grammars.

**Why:** User req. Vite = fast dual bundle (host + webview). React/Tailwind only where table UI needs it — not for extension host.

**Skip:** Webpack, Vue, full app shell frameworks.