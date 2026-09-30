# 007 — xcassets attributes (set vs slot)

**Status:** accepted — all three slices shipped  
**Date:** 2026-09-27  
**Phase:** 10

**Finding:** Xcode Attributes Inspector is three mechanisms, not one properties bag:

1. Root `properties` (render as, preserve vector, compression default, ODR, localize, …)
2. `images[]` **grid reshape** (Devices / Appearances / Scales / Gamut / …)
3. Per-`images[]` entry overrides when a single well is selected

**Do not** write AssetLib template keys (`devices`, `memory-set`, …) into catalog JSON.

**Impl:** `properties.ts` + `grid.ts` + `slotAttrs.ts`; UI panels in `XcassetsApp`.  
**Deferred:** alignment insets / 9-slice; appicon device size matrices.

**See:** [research/xcassets-attributes.md](../research/xcassets-attributes.md), [plan](../superpowers/plans/2026-09-27-xcassets-attributes.md)
