# xcassets Attributes Inspector (set + grid + slot)

**Date:** 2026-09-27  
**Research:** [xcassets-attributes.md](../../research/xcassets-attributes.md)  
**Scope:** all three slices

## Files

| File | Role |
|------|------|
| `src/xcassets/properties.ts` | Set `properties` fields + mutate |
| `src/xcassets/grid.ts` | Infer/apply imageset grid → reshape `images[]` |
| `src/xcassets/slotAttrs.ts` | Per-slot field list + mutate |
| `tests/xcassets/{properties,grid,slotAttrs}.test.ts` | TDD |
| `XcassetsDocument` / Provider / types / `XcassetsApp` | Wire + UI |

## Tasks

1. Expand set properties (compression, ODR, localizable, auto-scaling)
2. `grid.ts` reshape (devices, appearances+HC, scales, gamut, direction, size class, memory, graphics)
3. Per-slot panel + well selection
4. UI panels + messages
5. Docs/tasks update + commit

**Out:** alignment insets / 9-slice resizing; appicon size matrices; colorset grid (idiom/appearances only if cheap).
