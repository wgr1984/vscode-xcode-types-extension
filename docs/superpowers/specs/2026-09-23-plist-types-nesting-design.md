# Plist type select + nesting — Design Spec

**Date:** 2026-09-23  
**Status:** approved 2026-09-23  
**Parent:** [xcode-types-extension-design](./2026-09-23-xcode-types-extension-design.md)  
**Approach:** path-flat table (A) + correct sort; empty container rows; boolean as one type

## Goal

Plist table: proper type selection for all Apple property-list types; nested `array` / `dictionary` round-trip via path prefixes (not tree UI).

## Spec basis (Apple)

Official types from [About Property Lists](https://developer.apple.com/library/archive/documentation/Cocoa/Conceptual/PropertyLists/AboutPropertyLists/AboutPropertyLists.html):

| UI type | XML |
|---------|-----|
| string | `<string>` |
| integer | `<integer>` |
| real | `<real>` |
| boolean | `<true/>` / `<false/>` |
| date | `<date>` |
| data | `<data>` |
| array | `<array>` |
| dictionary | `<dict>` |

Containers nest any plist types. Dict keys must be strings. Root almost always dict/array; scalar root allowed by Apple, not required for this UI.

## Decisions

| Choice | Result |
|--------|--------|
| Nesting UI | Path-flat prefixes (`kids[0]`, `meta.city`); sorted parent→child |
| Empty containers | Own row (type `array`/`dictionary`, value blank) |
| Boolean | Type `boolean`; Value select `true`/`false` |
| Scope | Minimal: type `<select>` + nest serialize; no Add-child / tree |

## UI

Type column = `<select>` with options above. No free-text type.

| Type | Value cell |
|------|------------|
| string / integer / real / date / data | text |
| boolean | select true/false |
| array / dictionary | disabled |

Path stays text input.

## Paths + rebuild

**Grammar**

- Dict: `name`, `meta.city`
- Array: `kids[0]`, `kids[1].age`
- Keys containing `.` or `[`: out of scope (text editor)

**Flatten**

- Leaf → row
- Empty container → container row
- Non-empty container → container row + children

**Sort**

- Parent before children
- Sibling dict keys: XML entry order
- Array indices: ascending

**Unflatten**

- Paths → real nested `<dict>` / `<array>`
- Missing parent container row: infer from path (`[n]` → array, `.key` → dict)

**Type change**

- Leaf → container: clear value
- Container → leaf: delete descendant rows under that path (silent)

## Code touch

| File | Change |
|------|--------|
| `src/adapters/types.ts` | `Column.editor?: 'text' \| 'select'`; `options?: string[]` |
| `src/adapters/plist.ts` | type options; container flatten; real unflatten + sort; boolean cells |
| `src/webview/Table.tsx` | select / disabled value by type |
| `tests/adapters/plist.test.ts` | nest, empty, boolean, sort |
| `docs/decisions/003-shared-table-model.md` | ceiling updated |
| `docs/tasks.md` | phase tasks |

No new deps. Host↔webview messages unchanged.

## Errors

| Case | Behavior |
|------|----------|
| Bad path grammar | banner; refuse serialize overwrite |
| Duplicate path | banner; refuse serialize |
| Binary / parse fail | unchanged (D005) |

## Tests

- Nested dict + array round-trip
- Empty `<array/>` / `<dict/>` → container row → round-trip
- boolean → `<true/>` / `<false/>`
- Sort: parent before children
- Flat simple dict still works

## Out of scope

- Tree UI / Add-child buttons
- Keys with `.` or `[` in name
- Binary convert via `plutil`
- Date picker / data hex editor

## Related

- [D003 shared table](../../decisions/003-shared-table-model.md)
- [tasks](../../tasks.md)
