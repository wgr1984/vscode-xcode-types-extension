# Research: `.xcassets` (Asset Catalog)

**Date:** 2026-09-27  
**Branch / worktree:** `feature/xcassets`  
**Status:** research done — design not approved yet  
**Primary source:** [Apple Asset Catalog Format Reference](https://developer.apple.com/library/archive/documentation/Xcode/Reference/xcode_ref-Asset_Catalog_Format/AssetTypes.html) (archive; still accurate for folder layout). Cross-checked against real catalogs on disk (PassDeck/espasskey, Alamofire, firebase-ios-sdk).

## What it is

`.xcassets` is a **folder bundle**, not a single text file.

```
Assets.xcassets/                 ← catalog (optional root Contents.json)
├── Contents.json
├── AppIcon.appiconset/          ← subtype by folder extension
│   ├── Contents.json            ← required for most types
│   └── *.png
├── LaunchIcon.imageset/
│   ├── Contents.json
│   └── *.png / *.pdf / HEIF / jpg
├── AccentColor.colorset/
│   └── Contents.json            ← no binary kids; color lives in JSON
├── SomeGroup/                   ← group: no "." in name
│   └── …
└── …
```

Type encoded in **folder extension** (e.g. `Foo.imageset`). Invalid extensions ignored by `actool`.

## Clash with current extension model

Today: `CustomTextEditorProvider` + `FormatAdapter.parse(text)` / `serialize(model)` on **one text document**.

| Fact | Implication |
|------|-------------|
| Catalog = directory | Cannot open `*.xcassets` as `TextDocument` |
| Variants + PNGs live beside JSON | Table of `Contents.json` ≠ full Xcode image wells |
| Many subtypes, different JSON shapes | One adapter must branch on parent folder extension |
| Groups nest arbitrarily | Catalog browser needs tree walk |

VS Code `customEditors.selector.filenamePattern` matches **file** names (e.g. `**/Contents.json`). Clicking a folder in explorer expands it — does not open a custom editor. Full catalog UX needs `TreeDataProvider` and/or `CustomEditorProvider` (own document model) + `workspace.fs`.

## Subtypes (folder extensions)

### Official (Apple Types Overview)

| Extension | Role | Top-level JSON keys (typical) | Contents.json |
|-----------|------|-------------------------------|---------------|
| `.xcassets` | Catalog root | `info` | optional |
| *(no ext, no `.`)* | Group | `info`, `properties` | optional |
| `.imageset` | Named image (`UIImage` / `NSImage`) | `images`, `info`, `properties` | required |
| `.appiconset` | App icons | `images`, `info`, `properties` | required |
| `.colorset` | Named color | `colors`, `info` | required |
| `.dataset` | Arbitrary data files | `data`, `info` | required |
| `.launchimage` | Legacy launch images | `images`, `info` | required |
| `.iconset` | macOS iconset replica | *(files only)* | none |
| `.stickersiconset` | Messages extension icon | `images`, `info` | required |
| `.stickerpack` / `.sticker` / `.stickersequence` | iMessage stickers | pack: `stickers`+`properties`; sticker: `properties` | required |
| `.spriteatlas` | SpriteKit atlas | `info`, `properties` | optional |
| `.textureset` / `.cubetextureset` / `.mipmapset` | Metal textures | varies | required |
| `.brandassets` | tvOS layered icons / top shelf | `assets`, `info` | required |
| `.imagestack` / `.imagestacklayer` | Parallax layers (tvOS) | `layers` / image set kids | req / opt |
| `.arresourcegroup` / `.arimageset` | ARKit reference images | varies | — |
| `.complicationset` | watch complications | `assets`, `info` | required |
| `.gcdashboardimage` / `.gcleaderboard` / `.gcleaderboardset` | Game Center TV | — | optional |

### Seen later / common in modern Xcode (not always in archive TOC)

| Extension | Notes |
|-----------|--------|
| `.symbolset` | SF Symbol / custom symbol; `Contents.json` + SVG |
| Appearances on `.imageset` / `.appiconset` / `.colorset` | `appearances: [{ appearance: "luminosity", value: "light"\|"dark"\|"tinted" }]` |
| Single-size iOS app icon | `idiom: universal`, `platform: ios`, `size: 1024x1024` (+ dark/tinted wells) |

### Frequency on sampled local projects

| Ext | Count (sample) |
|-----|----------------|
| `.imageset` | 44 |
| `.appiconset` | 32 |
| `.colorset` | 17 |
| `.imagestack` | 4 |
| `.launchimage` | 2 |
| `.dataset` | 2 |
| `.complicationset` | 2 |
| `.brandassets` | 2 |

→ **v1 candidates by usage:** `imageset`, `appiconset`, `colorset`. Rest = list/unknown or later.

## `Contents.json` shapes (by subtype)

Shared:

```json
{ "info": { "author": "xcode", "version": 1 }, … }
```

### Image set (`.imageset`) — `images[]`

Slot / attribute tags per entry (subset):

- **Required-ish slots:** `idiom`, `scale`
- **File:** `filename` (png/jpg/pdf/HEIF); omit = empty well
- **Traits:** `appearances`, `display-gamut`, `width-class`, `height-class`, `memory`, `graphics-feature-set`, `screen-width`, `subtype`, …
- **Properties (set-level):** `preserves-vector-representation`, `template-rendering-intent`, `on-demand-resource-tags`, …

Real PassDeck-style dark variant:

```json
{
  "appearances": [{ "appearance": "luminosity", "value": "dark" }],
  "filename": "launch-icon-dark@2x.png",
  "idiom": "universal",
  "scale": "2x"
}
```

### App icon (`.appiconset`) — `images[]`

Extra slots: `size` (`20x20` … `1024x1024`), `role` / `subtype` (Watch), `platform`, `appearances` (light/dark/tinted). Older catalogs list many idiom×size×scale rows; newer iOS often one 1024 universal + appearances.

### Color (`.colorset`) — `colors[]`

```json
{
  "idiom": "universal",
  "appearances": [{ "appearance": "luminosity", "value": "dark" }],
  "color": {
    "color-space": "srgb",
    "components": { "red": "0.0", "green": "0.0", "blue": "0.0", "alpha": "1.000" }
  }
}
```

Components often **strings** in Xcode output (not numbers). Also: `display-gamut`, reference colors (`reference` key).

### Data set (`.dataset`) — `data[]`

`filename`, `idiom`, optional UTI / `universal-type-identifier`.

### Brand / complications

Catalog-of-children style: `assets: [{ filename, role, … }]` pointing at nested folders.

## Slot components (identity)

A **slot** = unique combo of slot tags inside one named asset. Duplicate slots invalid. Empty / omitted tags still part of identity.

Common idioms: `universal`, `iphone`, `ipad`, `mac`, `watch`, `tv`, `ios-marketing`, …

Scales: `1x`, `2x`, `3x`.

## UX gap vs Xcode (user screenshot)

Xcode Asset Catalog editor:

1. Left: asset list (AppIcon, LaunchIcon, …) by type icon  
2. Center: device / appearance matrix of **image wells**  
3. Drag-drop PNGs into wells; Attributes inspector for set props  

Our extension today: flat key/value **table**. Fits `Contents.json` **rows** (one row ≈ one slot). Does **not** equal image-well UI unless we add media preview + file copy separately.

## Architecture options (for design chat — not chosen)

| | Approach | Effort | Fits current code |
|---|----------|--------|-------------------|
| **A** | Table editor for `Contents.json` inside known `*.{imageset,appiconset,colorset,…}`; detect type from parent folder | Small | Yes — same `CustomTextEditor` + adapter |
| **B** | Tree view of catalog + open A on select | Medium | Tree new; table reuse |
| **C** | Full catalog custom editor (folder URI, wells, drag-drop) | Large | New `CustomEditorProvider`, not text adapters |

**Chosen:** **C** (2026-09-27). Ponytail still applies to MVP slice — not every Apple subtype day one.

## Risks

- Round-trip: Xcode JSON pretty-print + key order; naive `JSON.stringify` may churn diffs — preserve or accept churn (need decision).
- Opening a **directory** as custom editor — VS Code opens files; may need command / virtual doc / open root `Contents.json` + resolve sibling dirs via `workspace.fs`.
- Binary assets (PNG) — drag-drop must copy files into set folder + update `filename` in JSON.
- Archive docs incomplete vs Xcode 15/16 (appearances, tinted icons, symbolset).

## Open decisions (block design)

1. Primary UX: **C** — Xcode-like catalog (list + wells + drag).  
2. MVP slice: **3** — common subtypes day one; exotic = stub.  
3. Files: **D** — drag-drop copy + `filename` + preview.  
4. JSON write: **P** — pretty `JSON.stringify` (2-space); accept churn.

→ Ready for approaches / design.

## References

- https://developer.apple.com/library/archive/documentation/Xcode/Reference/xcode_ref-Asset_Catalog_Format/AssetTypes.html  
- https://developer.apple.com/library/archive/documentation/Xcode/Reference/xcode_ref-Asset_Catalog_Format/ImageSetType.html  
- https://developer.apple.com/library/archive/documentation/Xcode/Reference/xcode_ref-Asset_Catalog_Format/AppIconType.html  
- https://developer.apple.com/library/archive/documentation/Xcode/Reference/xcode_ref-Asset_Catalog_Format/Named_Color.html  
- https://code.visualstudio.com/api/extension-guides/custom-editors  
- Local sample: `espasskey-converter/.../Assets.xcassets` (imageset + colorset + appiconset + dark appearances)
