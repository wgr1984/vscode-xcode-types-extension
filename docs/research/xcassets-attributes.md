# Research: Xcode Image Set Attributes → `Contents.json`

**Date:** 2026-09-27  
**Worktree:** `xcassets-906b05a3`  
**Status:** research complete  
**Companion:** [`xcassets.md`](./xcassets.md) (catalog layout / subtypes)

**Primary sources:**
- [Apple — Image Set Type](https://developer.apple.com/library/archive/documentation/Xcode/Reference/xcode_ref-Asset_Catalog_Format/ImageSetType.html)
- [Apple — Contents.json / slot components](https://developer.apple.com/library/archive/documentation/Xcode/Reference/xcode_ref-Asset_Catalog_Format/Contents.html)
- [Apple — App Icon Type](https://developer.apple.com/library/archive/documentation/Xcode/Reference/xcode_ref-Asset_Catalog_Format/AppIconType.html)
- [Apple — Named Color Type](https://developer.apple.com/library/archive/documentation/Xcode/Reference/xcode_ref-Asset_Catalog_Format/Named_Color.html)
- [Apple — Group Type](https://developer.apple.com/library/archive/documentation/Xcode/Reference/xcode_ref-Asset_Catalog_Format/GroupType.html)
- [Apple — Providing images for different appearances](https://developer.apple.com/documentation/uikit/providing-images-for-different-appearances)
- [Apple — Localizing assets in a catalog](https://developer.apple.com/documentation/xcode/localizing-assets-in-a-catalog) (mirrored overview: [everest](https://apple-docs.everest.mt/docs/xcode/localizing-assets-in-a-catalog/))
- Xcode `AssetCatalogFoundation` / `AssetCatalogKit` / `AssetCatalogVisionFoundation` string tables (installed Xcode; keys like `preserves-vector-representation`, UI labels `Render As`, `Preserve Vector Data`, idiom `vision`)
- [brightdigit/AssetLib](https://github.com/brightdigit/AssetLib) — `ImageSetTemplateBuilder`, `AssetSpecificationProperties`, `AssetSpecification` (maps Xcode-like template knobs → real `Contents.json`; **template keys are not catalog keys**)
- Observed catalogs: PassDeck/espasskey `LaunchIcon.imageset`; Signal-iOS colorsets (contrast appearances); visionOS `idiom: "vision"` samples

**Caveat:** Apple’s archive stops short of Xcode 15/16 (Appearances, High Contrast, CarPlay, visionOS, Catalyst, localization). Those keys are confirmed from Xcode binaries + real `Contents.json` on disk / open source.

---

## 1. Mental model (set vs slot)

Xcode’s Attributes Inspector mixes **three JSON mechanisms**. Confusing them is the main bug risk for an editor.

| Mechanism | Where in JSON | Inspector feel |
|-----------|---------------|----------------|
| **A. Set properties** | Root `properties { … }` | Render As, Compression (default), Preserve Vector Data, Localize, ODR tags, Watch auto-scaling |
| **B. Grid reshape** | Shape of `images[]` (add/remove rows) | Devices, Appearances, Scales, Gamut, Direction, Width/Height Class, Memory, Graphics (+ Watch screen sizes, locales) |
| **C. Per-slot attributes** | Keys on **one** `images[]` object | Selecting a single well: `filename` + that slot’s identity traits / rare overrides |

**Critical:** There is **no** `devices`, `appearances` (at root), `display-gamuts`, `memory-set`, or `scaling` key in real Xcode image-set `Contents.json`. Checking those inspector boxes **rewrites** which rows exist in `images[]`. AssetLib’s [`ImageSetTemplate`](https://github.com/brightdigit/AssetLib) uses those names only as a **generator** format that expands into slots — never emit them into catalog JSON.

**Name** = rename of the folder (`LaunchIcon.imageset`), not a JSON field.

**Slot identity** (Apple): unique combination of slot-component tags on one entry. Duplicates in the same set are invalid. Core documented components: `idiom`, `scale`, `subtype`, `screen-width`, `width-class`, `height-class`. Modern practice also treats `appearances`, `display-gamut`, `language-direction`, `memory`, `graphics-feature-set`, and `locale` as part of identity.

Selection mode in Xcode:

- **Set selected** → grid checkboxes + set `properties`.
- **Single image well selected** → that row’s file + traits (and any per-slot override Apple allows).

---

## 2. Field-by-field map (Image Set inspector)

### 2.1 Name

| | |
|--|--|
| **UI** | Name |
| **Level** | Neither JSON — filesystem |
| **JSON** | — |
| **Notes** | Folder basename without `.imageset`. Renaming updates asset lookup name. |

### 2.2 Render As

| | |
|--|--|
| **UI** | Render As → Default / Original Image / Template Image |
| **Level** | **Set** (`properties`); Apple table also lists the key on image items, but Xcode practice is set-wide |
| **JSON** | `properties["template-rendering-intent"]` |
| **Values** | omit = Default (if asset name ends in `Template` → template, else original); `"original"`; `"template"` |
| **Source** | [Image Set Type § template-rendering-intent](https://developer.apple.com/library/archive/documentation/Xcode/Reference/xcode_ref-Asset_Catalog_Format/ImageSetType.html) |

### 2.3 Compression

| | |
|--|--|
| **UI** | Compression → Automatic / Lossless / Lossy / GPU Optimized Best / GPU Optimized Smallest / Inherited |
| **Level** | **Both**: set default in `properties`; optional **per-slot** override on an `images[]` entry (Apple marks it a slot component; “inherits from the parent” when omitted) |
| **JSON** | `properties["compression-type"]` and/or `images[i]["compression-type"]` |
| **Values** | omit = inherit (set→parent→lossless); `"automatic"`; `"lossless"`; `"lossy"`; `"gpu-optimized-best"`; `"gpu-optimized-smallest"` |
| **UI ↔ JSON** | “Inherited (Automatic)” with no override → **omit** the key |
| **Source** | [Image Set Type § compression-type](https://developer.apple.com/library/archive/documentation/Xcode/Reference/xcode_ref-Asset_Catalog_Format/ImageSetType.html); Xcode strings `compression-type`, `Automatic`, `Lossless` |

### 2.4 Preserve Vector Data

| | |
|--|--|
| **UI** | Preserve Vector Data (checkbox) |
| **Level** | **Set** |
| **JSON** | `properties["preserves-vector-representation"]`: `true` |
| **Values** | omit/`false` = rasterize PDF/SVG at build for scales; `true` = keep vector data at runtime |
| **Source** | Apple Image Set Type; common PDF/SVG Contents.json samples |

### 2.5 Devices (grid reshape)

| UI checkbox | Slot encoding | Notes |
|-------------|---------------|-------|
| Universal | `"idiom": "universal"` | Default; mutually exclusive with specific devices in typical Xcode UX (switching clears/rebuilds rows) |
| iPhone | `"idiom": "iphone"` | |
| iPad | `"idiom": "ipad"` | |
| Mac | `"idiom": "mac"` | |
| Apple TV | `"idiom": "tv"` | |
| Apple Watch | `"idiom": "watch"` | Often paired with `screen-width` when Watch sizes enabled |
| CarPlay | `"idiom": "car"` | Modern; not in archive idiom table |
| Apple Vision | `"idiom": "vision"` | Confirmed in Xcode Vision frameworks + visionOS samples; often `scale: "2x"` |
| Mac Catalyst | `"idiom": "ipad"` + `"subtype": "mac-catalyst"` | AssetLib / observed Catalyst encoding — **not** a separate idiom string |

**How the array changes:** Enabling a device adds empty (or scale-filled) rows for that idiom × current scales/appearances/… Disabling removes those rows (filenames for removed slot identities are dropped unless the editor remaps).

Archive idiom extras (mostly app-icon / watch roles, rarely image-set Devices UI): `ios-marketing`, `watch-marketing`, `appLauncher`, `companionSettings`, `notificationCenter`, `quickLook`.

### 2.6 Appearances (grid reshape)

| UI | Slot encoding |
|----|---------------|
| None / Any only | No `appearances` key on the “any” rows |
| Any, Dark | Base rows (no appearances) **plus** rows with `"appearances": [{ "appearance": "luminosity", "value": "dark" }]` |
| Light (when offered) | `"appearances": [{ "appearance": "luminosity", "value": "light" }]` |
| High Contrast | Additional rows with `"appearance": "contrast", "value": "high"`; often **combined** with luminosity on the same object |

Example (dark + high contrast):

```json
"appearances": [
  { "appearance": "luminosity", "value": "dark" },
  { "appearance": "contrast", "value": "high" }
]
```

App icons may also use luminosity `tinted` (Icon Studio / modern iOS icons) — more appicon than imageset.

**Source:** [Providing images for different appearances](https://developer.apple.com/documentation/uikit/providing-images-for-different-appearances); Signal-iOS / style-dictionary colorset JSON; Xcode `IBICLuminosityAppearance` / `IBICContrastAppearance`.

### 2.7 Scales

| UI | Slot encoding |
|----|---------------|
| Individual Scales | Each device × appearance … gets `"scale": "1x"` / `"2x"` / `"3x"` (idiom-dependent set; watch/tv/mac differ) |
| Single Scale | Typically **omit** `scale` (vector PDF/SVG one well); Apple: omit scale ⇒ any scale, expect vector |
| Individual and Single | Generator concept (AssetLib `scaling == nil`): both scaled rows **and** an unscaled row |

**Not a `properties` key.** Changing Scales rebuilds `images[]`.

### 2.8 Gamut

| UI | Slot encoding |
|----|---------------|
| Any / off | Omit `display-gamut` |
| sRGB & Display P3 | Duplicate slots with `"display-gamut": "sRGB"` and `"display-gamut": "display-P3"` |

Related (per-file color space, less common in inspector grid): `color-space` = `srgb` | `display-p3` on the image item.

### 2.9 Direction

| UI | Slot encoding |
|----|---------------|
| Fixed / Any | Omit `language-direction` |
| Left to Right / Right to Left / both | `"language-direction": "left-to-right"` and/or `"right-to-left"` on separate rows |

### 2.10 Width Class / Height Class

| UI | Slot encoding |
|----|---------------|
| Any | Omit |
| Compact / Regular | `"width-class"` / `"height-class"`: `"compact"` \| `"regular"` |

AssetLib only multiplies size classes onto `universal` idiom rows when generating from a template.

### 2.11 Memory

| UI | Slot encoding |
|----|---------------|
| None | Omit |
| Specific | `"memory": "1GB"` \| `"2GB"` \| `"3GB"` \| `"4GB"` \| `"6GB"` (6GB observed in AssetLib / modern catalogs; archive lists through 4GB) |

Enabling Memory adds **extra** rows (variants for higher memory), rather than a set property.

### 2.12 Graphics

| UI | Slot encoding |
|----|---------------|
| None | Omit |
| Metal feature sets | `"graphics-feature-set"`: `metal1v2`, `metal1v3`, `metal2v2`, `metal2v3`, `metal3v1`, `metal3v2`, `metal4v1`, `metal5v1`, … (plus community `apple6`) |

Same reshape pattern as Memory.

### 2.13 Localize

| | |
|--|--|
| **UI** | Localize… / Localization checkboxes for project languages |
| **Level** | **Set flag + slot reshape** |
| **JSON** | `properties["localizable"]: true` **and** `"locale": "<id>"` on localized `images[]` entries (e.g. `"en"`, `"de"`) |
| **Effect** | Adds per-locale wells (often in addition to unlocalized “development” slots) |
| **Source** | [Localizing assets](https://developer.apple.com/documentation/xcode/localizing-assets-in-a-catalog); AssetLib `localizable` + `locale`; Xcode `IBICLocale` |

### 2.14 On Demand Resource Tags

| | |
|--|--|
| **UI** | On Demand Resource Tags |
| **Level** | **Set** (also on **groups**) |
| **JSON** | `properties["on-demand-resource-tags"]`: `["tag1", "tag2"]` |
| **Note** | Apple archive sample misspells `on-demand-resources`; real key is `on-demand-resource-tags` |

### 2.15 Watch-related extras (often under Devices/Watch)

| UI concept | JSON | Level |
|------------|------|-------|
| Apple Watch screen sizes | `screen-width`: legacy `"<=145"` / `">145"`; AssetLib also documents `">161"`, `">183"` for newer sizes | Slot reshape |
| Auto Scaling (PDF on Watch) | `properties["auto-scaling"]: "auto"` | Set |

---

## 3. Full key inventory

### 3.1 Root document

| Key | Type | Role |
|-----|------|------|
| `info` | object | `{ "author": "xcode", "version": 1 }` |
| `properties` | object | Set-level attributes (below) |
| `images` | array | Slot list |

### 3.2 `properties` (true set properties)

| Key | Type | Typical UI |
|-----|------|------------|
| `template-rendering-intent` | string | Render As |
| `preserves-vector-representation` | bool | Preserve Vector Data |
| `compression-type` | string | Compression (default) |
| `on-demand-resource-tags` | string[] | ODR Tags |
| `localizable` | bool | Localize |
| `auto-scaling` | string (`"auto"`) | Watch PDF auto scale |
| `provides-namespace` | bool | **Groups** only |
| `pre-rendered` | bool | **App icons** (legacy shine) |

### 3.3 Each `images[]` entry

| Key | Kind | Values / notes |
|-----|------|----------------|
| `filename` | file | Omit = empty well |
| `idiom` | **slot** | `universal`, `iphone`, `ipad`, `mac`, `watch`, `tv`, `car`, `vision`, … |
| `scale` | **slot** | `1x`, `2x`, `3x`; omit = single/any (vector) |
| `appearances` | **slot** | `[{ appearance, value }, …]` — `luminosity`/`light`\|`dark`\|`tinted`; `contrast`/`high` |
| `display-gamut` | **slot** | `sRGB`, `display-P3` |
| `language-direction` | **slot** | `left-to-right`, `right-to-left` |
| `width-class` / `height-class` | **slot** | `compact`, `regular` |
| `memory` | **slot** | `1GB`…`6GB` |
| `graphics-feature-set` | **slot** | `metal*v*`, … |
| `screen-width` | **slot** | Watch width tags |
| `subtype` | **slot** | Watch sizes / `"mac-catalyst"` |
| `locale` | **slot** | BCP-47-ish id string |
| `platform` | slot-ish | More common on **app icons** (`ios`, …) |
| `compression-type` | override | Same enums as properties |
| `color-space` | attribute | `srgb`, `display-p3` |
| `template-rendering-intent` | rare on slot | Prefer set `properties` |
| `alignment-insets` | attribute | `{ top, bottom, left, right }` numbers |
| `resizing` | attribute | `{ mode, center, cap-insets }` — slicing UI |
| `unassigned` | Xcode | Internal |

---

## 4. How grid checkboxes rewrite `images[]`

Pattern used by Xcode (and mirrored by AssetLib’s `ImageSetTemplateBuilder`):

1. Start from device idioms × scales (or single unscaled).
2. For each enabled appearance value, **append** copies of existing specs with `appearances` set (base “Any” rows remain).
3. If gamut/direction/size-class/memory/graphics/watch-width/locales enabled, **multiply** (or append) slots along that axis.
4. Preserve `filename` only when the full slot identity still exists after the reshape.

**Example — Universal + Individual Scales + Any, Dark:**

```json
{
  "images": [
    { "idiom": "universal", "scale": "1x" },
    { "idiom": "universal", "scale": "2x" },
    { "idiom": "universal", "scale": "3x" },
    {
      "idiom": "universal",
      "scale": "1x",
      "appearances": [{ "appearance": "luminosity", "value": "dark" }]
    },
    {
      "idiom": "universal",
      "scale": "2x",
      "appearances": [{ "appearance": "luminosity", "value": "dark" }]
    },
    {
      "idiom": "universal",
      "scale": "3x",
      "appearances": [{ "appearance": "luminosity", "value": "dark" }]
    }
  ],
  "info": { "author": "xcode", "version": 1 },
  "properties": {
    "preserves-vector-representation": true
  }
}
```

(Matches PassDeck/espasskey `LaunchIcon.imageset` shape with filenames filled in.)

**Example — Single Scale vector:**

```json
{
  "images": [{ "idiom": "universal", "filename": "icon.pdf" }],
  "info": { "author": "xcode", "version": 1 },
  "properties": {
    "preserves-vector-representation": true,
    "template-rendering-intent": "template"
  }
}
```

**Example — Mac Catalyst device row:**

```json
{
  "idiom": "ipad",
  "subtype": "mac-catalyst",
  "scale": "2x"
}
```

**Example — Apple Vision:**

```json
{
  "idiom": "vision",
  "scale": "2x",
  "filename": "hero.png"
}
```

---

## 5. Properties vs idioms/slot dimensions (summary)

| True `properties` (do not reshape grid) | Grid / slot dimensions (reshape `images[]`) |
|-----------------------------------------|---------------------------------------------|
| `template-rendering-intent` | `idiom` (+ Catalyst `subtype`) |
| `preserves-vector-representation` | `scale` |
| `compression-type` (default; slot may override) | `appearances` |
| `on-demand-resource-tags` | `display-gamut` |
| `localizable` (flag; locales still reshape) | `language-direction` |
| `auto-scaling` | `width-class`, `height-class` |
| | `memory`, `graphics-feature-set` |
| | `screen-width`, `locale` |

---

## 6. Related types (brief)

### `.colorset`

- Array key: **`colors[]`** (not `images`).
- Slot traits: `idiom`, `appearances` (same luminosity/contrast), `display-gamut`.
- Payload: `color: { "color-space", "components": { red, green, blue, alpha } }` (components often **strings** in Xcode output); or `reference`.
- Little/no Render As / Preserve Vector / Scales UI.
- Source: [Named Color Type](https://developer.apple.com/library/archive/documentation/Xcode/Reference/xcode_ref-Asset_Catalog_Format/Named_Color.html).

### `.appiconset`

- Still `images[]`, but slots keyed heavily by **`size`** (`20x20`…`1024x1024`), Watch **`role`** / **`subtype`**, marketing idioms, optional **`platform`**, modern **appearances** (light/dark/tinted).
- Set `properties`: mainly `pre-rendered`; ODR possible.
- Devices checkboxes expand size×scale matrices, not a freeform image grid.
- Source: [App Icon Type](https://developer.apple.com/library/archive/documentation/Xcode/Reference/xcode_ref-Asset_Catalog_Format/AppIconType.html).

### Group (no extension)

- Optional `Contents.json`.
- `properties.provides-namespace` (bool) — “Provides Namespace”.
- `properties.on-demand-resource-tags` applies to children.
- No `images` array.
- Source: [Group Type](https://developer.apple.com/library/archive/documentation/Xcode/Reference/xcode_ref-Asset_Catalog_Format/GroupType.html).

### Symbol sets / others

- `.symbolset`: SVG + different rendering keys (`symbol-rendering-intent` appears in Xcode string tables).
- Out of scope for v1 imageset inspector parity.

---

## 7. Implementation notes (for this extension)

1. **Two selection modes:** set → `properties` + grid toggles; well → one `images[]` object.
2. **Grid toggles need reshape**, not property writes — preserve filenames by slot-identity match.
3. **Infer inspector state** by scanning existing `images[]` (which idioms/appearances/scales are present).
4. **Never write** AssetLib template keys (`devices`, `display-gamuts`, `memory-set`, …) into catalog files.
5. Suggested slices: (1) remaining set `properties`, (2) Appearances + Scales reshape, (3) Devices incl. Catalyst/Vision/Car, (4) Gamut/Direction/size class, (5) Memory/Graphics/Localize/ODR, (6) per-slot panel + compression override + slicing.

---

## 8. Sources checklist

- [x] Apple Image Set Type (properties, slot tags, enums)
- [x] Apple Contents.json slot-component identity
- [x] Apple App Icon / Named Color / Group
- [x] Appearances docs + real luminosity/contrast JSON
- [x] AssetLib builder: template → `images[]` + `properties` (and anti-pattern: don’t emit template keys)
- [x] Xcode framework strings: UI labels ↔ JSON keys; `vision` idiom; `mac-catalyst` subtype
- [x] Local samples (espasskey LaunchIcon)
- [ ] Optional follow-up: flip every inspector control in Xcode once and diff `Contents.json` for Watch screen-width / memory UI labels exactness
