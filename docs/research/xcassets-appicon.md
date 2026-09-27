# App Icon attributes

**Date:** 2026-09-28  
**Maps Xcode App Icon inspector → `Contents.json` `images[]` reshape.**

| UI | JSON effect |
|----|-------------|
| iOS = None | remove ios / iphone / ipad / ios-marketing / universal+platform ios rows |
| iOS = Single Size | `{ idiom: universal, platform: ios, size: 1024x1024 }` (+ appearance copies) |
| iOS = All Sizes | classic iphone/ipad/ios-marketing size×scale matrix |
| macOS = All Sizes | `idiom: mac` 16…512 @1x/@2x |
| watchOS = All Sizes | `idiom: watch` role/subtype matrix (common set) |
| Appearances Any, Dark, Tinted | luminosity `dark` / `tinted` on **single-size** wells; all-sizes usually any-only in practice (still apply when requested) |
| Gamut | `display-gamut` sRGB / display-P3 |
| Pre-rendered | `properties.pre-rendered` (already) |

Preserve `filename` via slot identity (idiom+platform+size+scale+appearances+gamut+role+subtype).
