# Claim-Ready Homebook visual system

## Direction and rationale

**Night-market neon signage** turns a dry inventory into a calm, memorable record-making ritual. A claim often follows a dark, disorienting event; the interface behaves like a row of clearly labelled stalls at night: deep ink surroundings, warm paper evidence, and small pools of electric light that lead to the next task. Decoration is limited to the evidence-vault hero and functional sign-like status markers. The content remains the brightest, most legible layer.

The experience is intentionally single-mode. Its ink-black canvas and luminous wayfinding are core to the thesis, not an incidental dark theme. Cream content surfaces prevent the “gaming dashboard” cliché and evoke receipts, labels, and a physical home ledger.

## Palette

| Token | Value | Use |
| --- | --- | --- |
| Night | `#0B1016` | App background and installed-app splash |
| Night raised | `#121B24` | Header, nav, secondary controls |
| Paper | `#FFF6E5` | Evidence sheets, dialogs, form fields |
| Ink | `#17202A` | Text on paper |
| Mist | `#B7C4CF` | Secondary text on night (7.1:1) |
| Muted ink | `#59636C` | Secondary text on paper (5.7:1) |
| Sign cyan | `#59F3E3` | Primary action/focus (13.4:1 against night) |
| Sign pink | `#FF5BA8` | Section accents and paid sign (5.6:1 against night) |
| Lantern | `#FFCA5C` | Warnings and evidence gaps |
| Ready | `#76E39A` | Complete/secure state |
| Danger | `#FF746C` | Destructive/error state |

Accent colors never carry meaning alone; every status has text or a symbol. Focus uses a 3px cyan outline with a dark offset. Form fields stay paper-white with dark type for familiar reading. Contrast was selected to clear WCAG AA for normal text.

## Typography

- **Display/signage:** `Arial Black`, `Franklin Gothic Heavy`, system sans-serif. Narrow tracking and selective uppercase reproduce hand-cut illuminated sign lettering without downloading a font.
- **Ledger/body:** `Inter`, `Avenir Next`, `Segoe UI`, system sans-serif. Body is 16px minimum, 1.55 leading; tables use tabular numerals.
- Scale: 14 caption, 16 body, 20 subhead, 26 section, fluid 40–64 display. There is exactly one `h1`; route and panel headings start at `h2`.

Using system families keeps the installed app fast and private while retaining a distinct typographic contrast.

## Spacing, shape, and depth

- 4px base rhythm; primary steps are 8, 12, 16, 24, 32, 48, 64.
- Reading measure is 68ch. Touch targets are at least 44px; adjacent actions have at least 8px separation.
- `2px` hard borders and `4px` chamfer-like radii evoke metal cases and laminated claim tags; avoid generic floating rounded cards.
- Independent records appear as cream evidence slips with a small punched-label edge. Groups use proximity and ruled dividers, not nested cards.
- Cyan/pink “neon” shadows are reserved for the main action, current navigation, and readiness change—not every surface.

## Interaction grammar

- The persistent header says whether records are **On this device** and whether the app is offline.
- Primary action: `Add an item`; it is visible in the header and empty state.
- Inventory is the home route. Search/filter controls sit immediately above the evidence slips. Each slip exposes edit; destructive removal is confirmed and then offers Undo.
- Adding and editing happens in a native dialog that returns focus to its trigger. Photo and receipt previews look pinned to the paper record.
- Export is a dedicated route. CSV and encrypted portable backup are always available. Claim Pack unlock adds the photo-rich PDF and print summary; accessibility, safety, and data ownership are never gated.
- Success/error messages use a bottom live-region “counter sign” and include the next useful action.

## Motion policy

- 180ms for pressed/focus/route feedback and 240ms for dialog and toast entrances. Elements move only 6–10px from their source; lists do not cascade.
- Readiness number briefly brightens when evidence improves; there are no looping animations or flashing signs.
- Under `prefers-reduced-motion: reduce`, transforms and smooth scrolling are removed, transitions become near-instant opacity changes, and decorative glow remains static.

## Responsive intent

- At 390px, header actions collapse to one clearly labelled menu row, the summary rail becomes a horizontal strip, records stack, and table-only columns become labelled lines.
- Desktop gains a sticky readiness rail and two-column workspace; phone retains all functions rather than hiding export or evidence fields.
- Safe-area padding protects installed-app controls. No fixed bar covers content.

## Asset plan and provenance

1. **`public/assets/evidence-vault.webp`** — original generated editorial still life for the empty/landing state: a small home silhouette assembled from labelled evidence envelopes, a camera, receipt fragments, and a secure archive case under cyan/magenta night-market tubes. It explains “turn household evidence into a portable packet.” Generated specifically for this product; no people, brands, readable text, watermark, or logos. Responsive AVIF/WebP derivatives, explicit dimensions, and mobile file ≤300 KB.
2. **Homebook mark and PWA icons** — original hand-authored geometric mark: a roof line closing into an archive drawer with a cyan evidence tab. Rasterized locally for manifest sizes. MIT project asset.
3. **Interface icons** — hand-authored inline SVG strokes using the same squared geometry. Decorative icons are hidden from assistive tech; labelled actions retain visible text.

### Image prompt sheet

- Use case: `stylized-concept`
- Asset type: PWA empty-state / welcome hero illustration
- Subject: an open, rugged household evidence archive case containing a compact house silhouette, neatly organized receipt slips, a small unbranded instant camera, photo cards, key tag, and numbered storage labels
- World: a quiet night-market documentation stall after rain, dark navy environment, subtle wet reflections, no people
- Materials: powder-coated metal case, cream ledger paper, translucent acrylic dividers, lightly worn domestic objects
- Light: cyan tube light from left, magenta sign light from right, small amber practical lamp; calm and trustworthy, not cyberpunk-chaotic
- Lens/composition: editorial three-quarter still life, landscape 3:2, hero object on right-center with clean dark negative space at upper left; no UI mockup
- Palette words: ink black, deep navy, receipt cream, electric cyan, sign pink, lantern amber
- Negative list: no readable text, no letters, no logos, no brands, no watermark, no people, no hands, no fire, no flood, no disaster imagery, no currency, no insurance-company imagery, no generic gradient, no excessive glow, no distorted objects
- Model: Azure `factory-image` via `/opt/fleet/lib/gen-image.sh`
- Date: 2026-08-28
- License: original generated project asset; shipped under the repository MIT license

