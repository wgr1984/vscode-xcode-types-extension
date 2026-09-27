# 007 — xcassets attributes (set vs slot)

**Status:** research done — implementation slice not chosen  
**Date:** 2026-09-27  
**Phase:** 10

**Finding:** Xcode Attributes Inspector is three mechanisms, not one properties bag:

1. Root `properties` (render as, preserve vector, compression default, ODR, localize, …)
2. `images[]` **grid reshape** (Devices / Appearances / Scales / Gamut / …)
3. Per-`images[]` entry overrides when a single well is selected

**Do not** write AssetLib template keys (`devices`, `memory-set`, …) into catalog JSON.

**See:** [research/xcassets-attributes.md](../research/xcassets-attributes.md)
