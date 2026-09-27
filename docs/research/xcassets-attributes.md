# Research: Xcode Image Set Attributes → `Contents.json`

**Date:** 2026-09-27  
**Trigger:** Xcode Attributes Inspector has far more than Preserve Vector / Render As; options apply to the **whole set** or a **single image slot**.  
**Primary sources:**
- [Apple — Image Set Type](https://developer.apple.com/library/archive/documentation/Xcode/Reference/xcode_ref-Asset_Catalog_Format/ImageSetType.html) (archive)
- [Apple — Contents.json / slot components](https://developer.apple.com/library/archive/documentation/Xcode/Reference/xcode_ref-Asset_Catalog_Format/Contents.html)
- [AssetLib `AssetSpecificationProperties` / `AssetSpecification`](https://github.com/brightdigit/AssetLib) (community model of real catalogs; **not** Xcode’s generator template)
- Xcode UI (user screenshot: LaunchIcon Image Set inspector)
- Local samples + earlier `docs/research/xcassets.md`

**Caveat:** Apple’s archive is incomplete vs Xcode 15/16 (Appearances, visionOS, CarPlay, High Contrast). Values below mix archive enums + observed modern keys.

---

## Mental model (critical)

Xcode’s inspector mixes **three different JSON mechanisms**:

| Mechanism | Where in JSON | What inspector section feels like |
|-----------|---------------|-----------------------------------|
| **A. Set properties** | Root `properties` object | Name-adjacent toggles: Render As, Compression (default), Preserve Vector, Localize, ODR tags, auto-scaling |
| **B. Slot grid config** | Shape of `images[]` (add/remove rows) | Devices, Appearances, Scales, Gamut, Direction, Width/Height Class, Memory, Graphics |
| **C. Per-slot attributes** | Keys on **one** `images[]` entry | Selecting a single well: filename + that slot’s traits / overrides |

There is **no** `devices: ["universal"]` key in real Xcode `Contents.json`. Checking “Universal” vs “iPhone” **rewrites** which `idiom` (+ scale/appearance) rows exist. AssetLib’s `ImageSetTemplate` (`devices`, `display-gamuts`, …) is a **generator** format that expands into `images[]` — do not write those template keys into catalog JSON.

**Name** = folder rename (`LaunchIcon.imageset`), not a JSON field.

---

## A. Set-level `properties` (whole image set)

Documented / observed under root `properties`:

| Xcode label | JSON key | Type | Values / notes |
|-------------|----------|------|----------------|
| Render As | `template-rendering-intent` | string | omit = Default (name ends in `Template` → template); `original`; `template` |
| Preserve Vector Data | `preserves-vector-representation` | bool | omit/`false` vs `true` (PDF/SVG) |
| Compression | `compression-type` | string | Often set-wide default. Values: omit/inherit; `automatic`; `lossless`; `lossy`; `gpu-optimized-best`; `gpu-optimized-smallest`. Apple also lists tag as **slot** (can override per image). |
| (Watch) Auto Scaling | `auto-scaling` | string/bool | watchOS PDF scaling; AssetLib: e.g. `auto` |
| Localize… | `localizable` | bool | When true, slots may carry `locale` |
| On Demand Resource Tags | `on-demand-resource-tags` | string[] | Set-level tags |
| (App Icon) Pre-rendered | `pre-rendered` | bool | App icon shine/mask legacy |

Apple sample also nests ODR under `properties` (archive sample has a typo `on-demand-resources`; real key is `on-demand-resource-tags`).

### Group folders

| Xcode label | JSON key |
|-------------|----------|
| Provides Namespace | `provides-namespace` |

---

## B. Slot grid config (set-level UI → many `images[]` rows)

These inspector controls **do not** store as a single property. They define the **cartesian product** of slot components Xcode materializes.

| Xcode label | Slot component key(s) | Effect when enabled at set level |
|-------------|----------------------|----------------------------------|
| **Devices → Universal** | `idiom`: `universal` | Default 1×/2×/3× (or single scale) rows |
| **Devices → iPhone / iPad / Mac / Apple TV / Apple Watch** | `idiom`: `iphone` / `ipad` / `mac` / `tv` / `watch` | Separate device rows (often instead of universal) |
| **Devices → CarPlay** | `idiom`: `car` (modern; not in old archive) | CarPlay wells |
| **Devices → Apple Vision** | `idiom`: `vision` (modern) | Usually 2× |
| **Devices → Mac Catalyst Scaled** | often `idiom` + `subtype` / platform-ish | Catalyst-specific slots (verify per Xcode version) |
| **Appearances → Any, Dark** | `appearances`: `[{ "appearance": "luminosity", "value": "dark" }]` | Extra rows for dark (and optionally light) |
| **Appearances → High Contrast** | `appearances` with `appearance`: `contrast` (+ value) | Extra HC rows (often combined with luminosity) |
| **Scales → Individual Scales** | `scale`: `1x`/`2x`/`3x` vs omit | Checked = per-scale wells; unchecked + vector = single unscaled PDF/SVG row |
| **Gamut** | `display-gamut`: `sRGB` / `display-P3` | Any = omit; else duplicate rows per gamut |
| **Direction** | `language-direction`: `left-to-right` / `right-to-left` | Fixed = omit; else LTR/RTL rows |
| **Width Class / Height Class** | `width-class` / `height-class`: `compact` / `regular` | Any = omit; else size-class matrix |
| **Memory** | `memory`: `1GB`…`4GB` | None = omit; else memory-class rows |
| **Graphics** | `graphics-feature-set`: `metal1v2`… | None = omit; else Metal feature rows |
| **Watch screen sizes** | `screen-width`: `<=145` / `>145` (legacy values evolve) | Extra Watch size slots |

**Localize** also expands slots with `"locale": "en"` etc. when localization is on.

Slot **identity** = unique combo of slot tags (Apple: idiom, scale, subtype, screen-width, width-class, height-class, plus modern appearances / gamut / direction / memory / graphics / locale). Duplicate identity invalid.

---

## C. Per-slot (single image selected)

When one well is selected, inspector edits **that** `images[]` object:

| Concern | Keys |
|---------|------|
| File | `filename` (omit = empty well) |
| Identity traits | `idiom`, `scale`, `appearances`, `display-gamut`, `language-direction`, `width-class`, `height-class`, `memory`, `graphics-feature-set`, `screen-width`, `subtype`, `locale`, … |
| Optional overrides | `compression-type`, `color-space` (`srgb` / `display-p3`) — Apple lists these on the image item; inherit from parent/`properties` if omitted |
| Template intent | Apple table lists `template-rendering-intent` on the image item; practice usually keeps it in **set** `properties` |
| Slicing | `alignment-insets` `{top,bottom,left,right}`, `resizing` `{mode, center, cap-insets}` |
| Xcode internal | `unassigned` |

Selecting the **set** (not a well) shows Devices/Appearances/… as the **grid editor**. Selecting a **well** shows that slot’s file + traits.

---

## Mapping screenshot → JSON (LaunchIcon)

From user screenshot (Universal + Any, Dark; Preserve Vector checked; Render As Default; Compression Inherited):

```json
{
  "images": [
    { "idiom": "universal", "scale": "1x", "filename": "…" },
    { "idiom": "universal", "scale": "2x", "filename": "…" },
    { "idiom": "universal", "scale": "3x", "filename": "…" },
    {
      "idiom": "universal",
      "scale": "1x",
      "appearances": [{ "appearance": "luminosity", "value": "dark" }],
      "filename": "…"
    },
    { "…": "dark 2x/3x likewise" }
  ],
  "info": { "author": "xcode", "version": 1 },
  "properties": {
    "preserves-vector-representation": true
  }
}
```

- Compression “Inherited (Automatic)” → **omit** `compression-type` (inherit).
- Devices only Universal → only `idiom: universal` rows.
- Appearances Any, Dark → any (no appearances key) + dark rows.

---

## Colorset / appiconset (brief)

| Type | Set properties | Slot array | Grid traits |
|------|----------------|------------|-------------|
| `.colorset` | rarely used | `colors[]` | `idiom`, `appearances`, `display-gamut`; color payload in `color` |
| `.appiconset` | `pre-rendered`; ODR | `images[]` | `idiom`, `size`, `scale`, `platform`, `role`, `subtype`, `appearances` |
| `.group` | `provides-namespace` | — | — |

---

## What we ship today vs gap

| Area | Status |
|------|--------|
| Set: preserve vector, render as | done |
| Set: provides-namespace (group), pre-rendered (appicon) | done |
| Set: compression, ODR tags, localizable, auto-scaling | missing |
| Grid config UI (Devices / Appearances / Scales / …) | missing — wells are fixed templates today |
| Per-slot attribute panel (select one well) | missing — only drop filename |
| Alignment insets / resizing | missing (defer) |

---

## Implementation implications

1. **Two selection modes in UI:** catalog node selected → set properties + grid toggles; image well selected → slot attributes (+ optional overrides).
2. **Grid toggles ≠ property writes** — need `reshapeImages(contents, gridConfig)` that adds/removes `images[]` entries while preserving `filename` when slot identity still matches.
3. **Infer grid from existing `images[]`** for inspector checkboxes (derive devices/appearances/scales from current slots).
4. **Ponytail slices:** (1) finish set `properties` parity, (2) Appearances + Individual Scales reshape, (3) Devices, (4) Gamut/Direction/size classes, (5) Memory/Graphics/ODR/Localize, (6) per-slot panel + compression override.

---

## Sources checklist

- [x] Apple Image Set Type tables (properties + slot tags + enums)
- [x] Apple slot-component identity rules
- [x] AssetLib properties vs image keys (real Contents.json shape)
- [x] AssetLib ImageSetTemplate called out as generator-only (do not emit `devices` / `memory-set` keys)
- [x] User Xcode screenshot cross-walk
- [ ] Optional: dump one Xcode-authored catalog after flipping every inspector control (manual follow-up for vision/car/HC exact strings)
