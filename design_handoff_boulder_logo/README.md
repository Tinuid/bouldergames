# Handoff: Boulder Challenges — Logo „The Hold"

## Overview
Brand mark for **Boulder Challenges**. The logo — internally „The Hold" — is a two-tone
circle split on a 135° diagonal: **ink** in the upper-left half, **vermilion** in the
lower-right. It references the coloured climbing-hold dots used throughout the app's UI, so
the brand and the product share one visual language. It pairs with a **Bricolage Grotesque**
wordmark ("Boulder" in ink, "Challenges" in vermilion).

## About the Design Files
These are **final, production-ready vector assets** (plain SVG) plus a preview page. The mark
is resolution-independent and font-independent — drop the SVGs straight into the codebase. The
**wordmark is set type, not an image** (see "Wordmark" below). Recreate the lockup in the app
with the mark SVG + CSS-styled text using your existing font setup.

## Files
| File | What it is | Use |
|---|---|---|
| `logo-mark.svg` | The mark only, transparent background (100×100, ink + vermilion) | Anywhere on light/paper surfaces — the core brand asset |
| `logo-mark-reverse.svg` | Same mark, ink half replaced with paper `#FCFBF7` | On **dark / ink** backgrounds, where the ink half would otherwise disappear |
| `app-icon.svg` | Mark centred on a rounded paper tile (1024×1024, corner radius 224) | App icon / store icon. Export to PNG at 1024 and let the platform mask corners |
| `favicon.svg` | High-contrast tile version, legible down to 16px | Browser favicon / small tab icon |
| `logo.html` | Preview: lockups (light + dark + horizontal), icon sizes, colours | Reference only — open in a browser |

## Colours
| Role | Hex |
|---|---|
| Ink (mark dark half, "Boulder", text) | `#221F19` |
| Vermilion (mark light half, "Challenges", accent) | `#E2522A` |
| Paper (tile / reverse-mark light half) | `#FCFBF7` |
| Background (app canvas) | `#F4F0E8` |

These match the app's Chalk theme tokens (`--ink`, `--accent`, `--surface`, `--bg`).

## Wordmark
- Font: **Bricolage Grotesque, weight 800.**
- Tracking: `-0.03em`. Line-height: `0.92` for the two-line lockup.
- Two-line (primary): "Boulder" on top in ink `#221F19`, "Challenges" below in vermilion
  `#E2522A`.
- One-line (tight spaces): "Boulder Challenges", same two colours, line-height `1`.
- The wordmark is **type, not a bundled image.** In the app, render it with CSS (the font is
  already loaded in the project). For static exports (e.g. social share images) where the font
  can't be guaranteed, convert the text to outlines in your design tool.

## Lockup construction
- Place the mark to the **left** of the wordmark.
- Mark height ≈ the wordmark's two-line cap height (in the preview: 58px mark next to a 32px
  wordmark). Gap between mark and wordmark ≈ 0.3× the mark height.
- On dark backgrounds use `logo-mark-reverse.svg`; "Boulder" becomes paper `#FCFBF7`,
  "Challenges" stays vermilion.

## Clearspace & minimum size
- **Clearspace:** keep free space around the lockup equal to at least the mark's radius on all
  sides.
- **Minimum sizes:** mark ≥ 16px; full lockup ≥ 120px wide. Below that, use the mark alone.

## Do / Don't
- ✅ Use the mark alone as an icon, avatar, loading state, or watermark.
- ✅ Keep the 135° split orientation (ink upper-left, vermilion lower-right).
- ❌ Don't recolour the mark outside the brand palette, rotate the split, add gradients or
  shadows, or stretch it to a non-circle.
- ❌ Don't re-typeset the wordmark in another font or change the two-colour split.

## Implementation notes (per platform)
- **Web:** use `favicon.svg` for `<link rel="icon">`; inline `logo-mark.svg` where you need it
  to inherit theme. Build the lockup as `mark + <span>` text.
- **iOS/Android:** export `app-icon.svg` → PNG at the required densities (1024 master). The
  rounded tile is baked in for general use; for the iOS app icon you can also place the mark on
  the paper background full-bleed and let the OS apply its own mask.
- The split-circle geometry is two SVG shapes (a full vermilion `<circle>` + an ink/paper
  semicircle `<path>` along the diameter) — trivial to redraw at any size if needed.
