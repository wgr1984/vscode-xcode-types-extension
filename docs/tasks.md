# Tasks

Track execution. Update status only when work starts/finishes.

Statuses: `todo` | `doing` | `done` | `blocked`

## Phase 0 — Docs / design

| ID | Task | Status | Notes |
|----|------|--------|-------|
| T0.1 | Vision + setup + ideas docs | done | `docs/` |
| T0.2 | Decision notes | done | |
| T0.3 | Resolve open decisions (priority, binary plist) | done | D004=default table; D005=banner |
| T0.4 | Approve design (brainstorm gate) | done | §§1–4 OK |
| T0.5 | Formal design spec | done | approved 2026-09-23 |
| T0.6 | Implementation plan | done | plan file |

## Phase 1 — Scaffold

| ID | Task | Status | Notes |
|----|------|--------|-------|
| T1.1 | package.json + contributes | done | |
| T1.2 | Vite dual build | done | |
| T1.3 | Custom editor webview | done | |
| T1.4 | F5 launch config | done | manual smoke pending |

## Phase 2 — Parsers

| ID | Task | Status | Notes |
|----|------|--------|-------|
| T2.1 | `.strings` | done | |
| T2.2 | `.xcconfig` | done | |
| T2.3 | `.plist` XML | done | hand parser, no xmldom |
| T2.4 | `.xcstrings` | done | |
| T2.5 | Binary plist detect | done | |

## Phase 3 — Table UI

| ID | Task | Status | Notes |
|----|------|--------|-------|
| T3.1 | React table | done | |
| T3.2 | host ↔ webview messages | done | |
| T3.3 | Bind adapters | done | |
| T3.4 | Dirty / save smoke | todo | needs F5 |

## Phase 4 — Highlight

| ID | Task | Status | Notes |
|----|------|--------|-------|
| T4.1–T4.4 | TextMate ×4 | done | |

## Phase 5 — Ship check

| ID | Task | Status | Notes |
|----|------|--------|-------|
| T5.1 | Package vsix | done | `xcode-types-0.0.1.vsix` |
| T5.2 | Install smoke VS Code + Cursor | todo | you |
| T5.3 | README for humans | todo | skip until smoke OK |

## Phase 6 — Plist types + nesting

Spec: [plist-types-nesting-design](./superpowers/specs/2026-09-23-plist-types-nesting-design.md)

| ID | Task | Status | Notes |
|----|------|--------|-------|
| T6.0 | Design approve + plan | done | plan: `superpowers/plans/2026-09-23-plist-types-nesting.md` |
| T6.1 | Column editor meta (`select` / options) | done | types.ts + Table.tsx |
| T6.2 | Plist type select + boolean value | done | |
| T6.3 | Flatten container rows + sort | done | |
| T6.4 | Unflatten nest rebuild | done | |
| T6.5 | Tests (nest / empty / boolean / sort) | done | |
| T6.6 | Update D003 + sample plist | done | F5 smoke: you |
| T6.7 | Fix empty-path type wipe + Add child | done | `+ child` on array/dict rows |
| T6.8 | Fix mid-array delete ghost hole | done | renumber + densify |
