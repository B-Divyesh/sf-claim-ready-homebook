# Independent verification 3 — Build a home insurance record

**Verdict: PASS — 0 findings; 0 untested public claims.**

Verified on 5 September 2026 against
`https://claim-ready-homebook.sociobot.in`.

- **Job:** build a portable home insurance record with belongings, proof, and
  locations before a loss.
- **Audience:** renters and homeowners preparing that evidence.
- **First action:** **Try it with sample data**; it opens three example records
  in a separate demo.

The implementation reviewed is
`b35b74bda20f787b474da93cd577c9be6e6b9d3e`. The documentation baseline is
`bfc047b0099315b9e7b16b8968adbc4adf67d025`; its only difference from the
implementation candidate is `.factory/handoff.md` documentation. The deployed
`index.html`, service worker, manifest, primary JavaScript, and primary CSS
each matched the clean candidate build by SHA-256.

## Clean checkout and declared claims

I cloned the documentation baseline into a new temporary directory, ran
`npm ci`, and ran every declared quality and claim command there. `npm audit`
reported zero vulnerabilities.

| Check | Result |
| --- | --- |
| `npm test` | Pass, 5/5 |
| `npm run typecheck` | Pass |
| `npm run lint` | Pass |
| `npm run build` | Pass; produced `dist/index.html` |
| `npm run test:e2e -- --reporter=line` | Pass, 30/30 desktop and 390 × 844 Chromium tests |
| `@claim:demo-isolation` | Pass individually |
| `@claim:offline-reload` | Pass individually |
| `@claim:local-only` | Pass individually |
| `@claim:csv-export` | Pass individually |
| `@claim:inventory-records` | Pass individually |
| `@claim:json-export` | Pass individually |
| `@claim:encrypted-backup` | Pass individually |
| `@claim:pdf-export` | Pass individually |
| `@claim:fifty-item-portability` | Pass individually (25.1 s) |
| `@claim:remove-undo` | Pass individually |

The ten public claims in `.factory/claims.json` have one tagged outcome test
each. I also cross-checked the live copy, README, export, privacy, and terms
text against the registry: the privacy, export, encryption, demo, scale, and
free-PDF statements are covered by those ten tests; the stated non-goals do
not promise a product capability. No unlisted public capability claim remains.

## Live browser verification

Fresh 1440 × 1000 desktop and 390 × 844 phone Chromium contexts both showed,
before scrolling, the required job heading, renter/homeowner audience sentence,
and sample action. The live sample route loaded three realistic records and the
persistent **Demo — sample data, nothing is saved** label. On desktop I added a
demo-only record, reset to the three-record seed, chose **Start for real**, and
confirmed that the demo-only record did not appear in the normal inventory.

The factory URL verifier passed: HTTP 200, title, `lang="en"`, exactly one
`h1`, a main landmark, complete image alternatives, labelled buttons, and no
page or console errors. Axe scans on `/demo`, `/export?demo=1`, `/guide`,
`/privacy`, and `/terms` found no serious or critical violations at both
desktop and phone sizes. Every internal route link collected from those pages
returned HTTP 200. The deliberately unknown URL returned HTTP 404 and the
styled **Page not found** page with a return link.

A fresh phone context received service-worker control, reloaded `/demo` while
offline, displayed **Offline • records still available**, and downloaded a CSV.
Keyboard testing put the skip link first and restored focus to the dialog
opener after Escape. With reduced motion, the measured transition duration was
`0.00001s`; at 200% root text the 390 px page remained 390 px wide. Route
titles, headings, legal pages, canonical metadata, CSP/frame-ancestors,
security headers, manifest, icons, sitemap, and local-only request behavior
all passed their checks.

Live Lighthouse 12.8.2 mobile results: Performance **100**, Accessibility
**100**, Best Practices **100**, SEO **100** (FCP 0.9 s, LCP 1.1 s, TBT 0 ms,
CLS 0). The initial build is 43.38 KB JavaScript (15.29 KB gzip) and 20.30 KB
CSS (5.46 KB gzip), within the static budget.

## Earlier finding disposition

| Earlier item | Current disposition and verification |
| --- | --- |
| Immutable cache defect from verification 1 | Fixed. Candidate/live assets match; deployment guard and build pass. |
| F01 demo absent or touching real storage | Fixed. Isolated demo claim and fresh live reset/start-real flow pass. |
| F02 broken paid checkout | Fixed honestly. Checkout UI is absent; PDF claim packet is free and its claim verifies no checkout link. |
| F03 no claim registry/tests | Fixed. Ten registered, individually passing claim commands. |
| F04 populated contrast | Fixed. Populated demo is included in passing axe coverage. |
| F05 200% text overflow | Fixed. Verified live at 390 px. |
| F06 dialog/history focus | Fixed. Dialog restoration and route-focus regressions pass. |
| F07 stale titles/repeated route heading | Fixed. Route-specific title and one `h1` verified. |
| F08 unknown route served 200 | Fixed. Live unknown URL is styled HTTP 404. |
| F09 first-screen/plain-words structure | Fixed. Fresh desktop and phone checks passed; copy audit remains clean. |
| F10 update discarded draft | Fixed. Passing desktop/mobile regression keeps the open draft after update notice. |
| F11 failed import lost retry state | Fixed. Encrypted-backup claim checks open recovery panel, retained selected file, error, and successful retry. |
| F12 undersized targets | Fixed. Desktop/mobile regression checks Edit, Remove, and Terms at 44 px or larger. |
| F13 metadata/common shell/CSP missing | Fixed. Live verifier, headers, metadata, sitemap, shared header/footer, and 404 checks pass. |
| Pending physical iOS/Android install smoke | Still not claimed. Chromium mobile emulation is passing; this is a prudent future launch check, not a current defect or public claim. |

This static PWA has no backend, so tenant isolation, restart persistence,
health, and 429/Retry-After checks do not apply. No CLI, library, or desktop
artifact is shipped.

Evidence retained under `/work/.evidence/homebook-verify-3/` includes the URL
verifier output, desktop/mobile screenshots, the live Lighthouse JSON, and the
demo-add diagnostic screenshot.
