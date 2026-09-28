# Research: Localizing `.xcassets` assets

**Date:** 2026-09-28  
**Screenshot:** Xcode Image Set inspector — Localization checkboxes (English / French / German / Spanish) create per-language well groups (Universal + German + French).

## Sources

- [Apple — Localizing assets in a catalog](https://developer.apple.com/documentation/xcode/localizing-assets-in-a-catalog) (also [mirror](https://apple-docs.everest.mt/docs/xcode/localizing-assets-in-a-catalog/))
- [Managing assets with asset catalogs](https://developer.apple.com/documentation/Xcode/managing-assets-with-asset-catalogs)
- [SO — localize images in Images.xcassets](https://stackoverflow.com/questions/21310819/how-to-localize-the-images-in-images-xcassets)
- Prior notes in [`xcassets-attributes.md`](./xcassets-attributes.md) § Localize
- AssetLib: `properties.localizable` + per-image `locale`

## What Xcode does

1. Attributes inspector → **Localization** lists **project languages** (from known localizations), not a free-form tag list.
2. Checking a language adds a **named section** of wells (same Devices × Scales × Appearances matrix as Universal).
3. **Universal** (no language) remains the fallback / development language assets.
4. Localizable types (Apple): color sets, image sets, symbol sets, watch complications, TV image stacks, sprite atlases. **Not** app icons in the same way for v1 focus.

## JSON encoding

| Concern | Encoding |
|---------|----------|
| Set is localized | `properties.localizable: true` |
| Base / Universal wells | `images[]` entries **without** `locale` |
| Language-specific wells | Same slot identity **plus** `"locale": "<id>"` (BCP-47-ish: `en`, `de`, `fr`, `zh-Hans`, …) |
| Unchecking a language | Remove all `images[]` rows with that `locale` (filenames for those identities drop unless remapped) |

Example (Universal + German, dark @2x):

```json
{
  "images": [
    { "idiom": "universal", "scale": "2x", "filename": "a.png" },
    {
      "idiom": "universal",
      "scale": "2x",
      "appearances": [{ "appearance": "luminosity", "value": "dark" }],
      "filename": "a-dark.png"
    },
    {
      "idiom": "universal",
      "scale": "2x",
      "locale": "de",
      "filename": "a-de.png"
    },
    {
      "idiom": "universal",
      "scale": "2x",
      "locale": "de",
      "appearances": [{ "appearance": "luminosity", "value": "dark" }],
      "filename": "a-de-dark.png"
    }
  ],
  "properties": { "localizable": true }
}
```

`locale` is part of **slot identity** (with idiom/scale/appearances/…).

## UX adaptation for this editor

| Xcode | Our editor |
|-------|------------|
| Localization language checkboxes | Checkbox list from project locales |
| Project language list | `*.xcstrings` (`sourceLanguage` + `localizations` keys) **and** `*.lproj`; if either present → **restrict** picker to those (+ locales already on the asset). Else common fallback. |
| Universal / German / French sections | Group wells under locale headers |
| Boolean “Localizable” alone | Derived: `locales.length > 0` → set `localizable` |

## Project locale discovery

1. Scan workspace `**/*.xcstrings` → union of `sourceLanguage` and all `strings.*.localizations` keys.
2. Scan `**/*.lproj/**` → folder basename without `.lproj`.
3. If (1)+(2) non-empty → Localization UI shows **only** those ids (plus any already used on the current asset so edits stay visible).
4. Else → common language list + free-form Add.

## Out of scope (v1)

- Export/import XLIFF localization workflow
- Symbolset / complications localization
- Renaming project languages
