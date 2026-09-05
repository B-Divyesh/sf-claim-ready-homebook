# Claim-Ready Homebook — repair 2 handoff

## Release status

Repair 2 is complete for the static product. Implementation commit
`b35b74bda20f787b474da93cd577c9be6e6b9d3e` was pushed, built from a clean
checkout, deployed, and verified at
`https://claim-ready-homebook.sociobot.in` on 5 September 2026. This handoff is
a later documentation-only change; it does not require another product image.

The job is now stated on the first screen: build a home insurance record. The
audience is renters and homeowners preparing proof before a loss. The first
action is **Try it with sample data**.

## What changed

- Added a one-click demo at `/demo` with three realistic records. Demo data
  uses the separate `claim-ready-homebook-demo` IndexedDB database and
  `demo:` local-storage prefix. A persistent banner labels the sample. Reset
  restores its seed, and Start for real discards the demo without reading or
  changing the normal inventory.
- Removed the advertised purchase and license UI because the production
  Sociobot product is not registered. The PDF claim packet is now free. The
  site has no dead checkout, fake payment, or embedded provider credential.
- Added `.factory/claims.json`. Its ten public claims each have exactly one
  `@claim:<id>` Playwright test that checks the user-visible outcome from the
  clean demo, including downloads, encryption, cross-profile recovery,
  offline reload, request origins, 50-item portability, and undo.
- Rebuilt the landing page in plain words and the required information order.
  Added route-specific titles and headings, history/focus handling, common
  navigation and footer, metadata, social image, sitemap entries, and a
  designed HTTP 404 response.
- Kept add-item drafts open when service-worker notices arrive. A failed
  encrypted import now retains the selected file, open recovery section, and
  retry path. Dialogs restore focus to their opener.
- Corrected populated-state contrast, 44 px controls, 200% text layout,
  reduced-motion behavior, and focus states. Added populated-route axe and
  keyboard-oriented regression coverage.
- Hardened backup validation and expanded CSV to include every saved text
  field. PDF, JSON, CSV, and encrypted export remain available without an
  account.
- Updated build dependencies to patched versions. `npm audit` reports zero
  production or development vulnerabilities.
- Added `.factory/demo.md`, `.factory/copy-audit.md`, the claim registry, and
  current run/deploy documentation. The catalog description is verb-first and
  75 characters long, and is copied to the required evidence location.

AI assistance was not added. This is a deterministic record-and-export task,
and a model call would weaken the offline and local-only behavior without
improving the core job.

## Review finding disposition

| Review 1 finding | Disposition and regression evidence |
| --- | --- |
| F01 demo absent and `/demo` changed real data | Fixed. `@claim:demo-isolation` creates real data, changes and resets the sample, returns to normal mode, and inspects both databases. |
| F02 advertised $19 checkout returned 404 | Fixed honestly. Unregistered paid UI and the broken link were removed; PDF is free. Billing registration remains an external dependency before paid access can be offered. |
| F03 no claim registry or tagged tests | Fixed. Ten registry entries map one-to-one to ten outcome tests; every declared command passed separately. |
| F04 populated “No photo” contrast was 4.12:1 | Fixed. Populated demo axe scans report no serious or critical violations on desktop or phone. |
| F05 horizontal overflow at 200% text | Fixed. The live 390 px phone page remains exactly 390 px wide at 200% text. |
| F06 dialog and route focus defects | Fixed. Dialog close restores the opener; route changes focus the new heading and announce it. |
| F07 stale titles and repeated headings | Fixed. Every route has a specific title and one route-specific `h1`; history navigation is covered. |
| F08 unknown routes returned the app with 200 | Fixed. Unknown public URLs return the styled 404 document with HTTP 404 and a Home link. |
| F09 landing structure and copy contract missing | Fixed. First screen names the job, audience, action/result, and three facts. `.factory/copy-audit.md` has no sentence over 22 words or banned term. |
| F10 update event erased an open draft | Fixed. Notices update the live region without rerendering the form; the draft regression passes on both projects. |
| F11 wrong passphrase closed recovery and lost file | Fixed. The file and disclosure persist, the error is announced, and a corrected retry succeeds. |
| F12 small touch targets | Fixed. Automated checks cover visible controls at desktop and 390 px widths. |
| F13 incomplete metadata, common shell, and CSP | Fixed. Canonical/social metadata, 1200×630 product art, icons, headers, sitemap, common shell, and response-header `frame-ancestors` are present. |

The earlier immutable-cache repair remains in place and is still checked by
unit and build-time deployment tests. The two low recovery defects recorded in
verification 2 are F10 and F11 above and are now closed. The twelve untested
sentences from review 1 were either consolidated into the ten registered
claims or removed; the current landing page, application routes, legal pages,
and README have no unregistered public behavior claim.

## Clean verification

The final candidate was cloned to a new temporary directory at commit
`b35b74bda20f787b474da93cd577c9be6e6b9d3e`. From that checkout:

- `npm ci`: passed with the lockfile.
- `npm audit`: zero vulnerabilities.
- `npm test`: 5/5 passed.
- `npm run typecheck`: passed.
- `npm run lint`: passed.
- `npm run build`: passed and produced `dist/index.html`.
- Every command in `.factory/claims.json`: 10/10 passed separately.
- `npm run test:e2e -- --reporter=line`: 30/30 passed across desktop Chromium
  and a 390×844 phone viewport.

The outcome suite covers clean demo entry, normal/invalid/boundary paths,
reload persistence, search, attachments, CSV/JSON/PDF/encrypted downloads,
wrong-passphrase recovery, cross-profile import, 50 records, remove/undo,
keyboard focus, route history, reduced motion, 200% text, offline update, and
populated-state accessibility. The offline claim creates and closes its own
browser context.

Production budgets for the initial route are 43.38 KB JavaScript (15.29 KB
gzip), 20.30 KB CSS (5.46 KB gzip), and a 16.84 KB mobile AVIF hero. PDF
libraries load only when a PDF is requested.

## Live verification

The durable static deployment reused only `sf-claim-ready-homebook` in its
existing region. The deployed primary JavaScript SHA-256 matches the final
local build.

- The factory URL verifier returned HTTP 200 with one `h1`, `lang="en"`, a
  `main` landmark, complete image alternatives, labelled buttons, and no
  console or page errors.
- Fresh 1440×1000 desktop and 390×844 phone contexts identified the job,
  audience, and first action before scrolling.
- The sample opened with three records and the persistent demo label. A sample
  change and reset worked, Start for real returned to the unchanged normal
  record, and all observed requests stayed on the product origin.
- `/demo`, `/export`, `/guide`, `/privacy`, and `/terms` returned 200 with
  distinct titles, one `h1`, and zero serious or critical axe findings.
- An unknown route returned HTTP 404 with the designed page. CSP,
  `frame-ancestors`, referrer, permissions, HSTS, and `nosniff` headers are
  present.
- After service-worker control, the demo reloaded offline with its three
  records and visible offline state. Reduced-motion transitions were
  effectively instant. The phone page had no horizontal overflow at 200%
  text.
- Final mobile Lighthouse 12.8.2: Performance **100**, Accessibility **100**,
  Best Practices **100**, SEO **100**; FCP **1.032 s**, LCP **1.107 s**, TBT
  **0 ms**, CLS **0**.

Live JSON, screenshots, verifier output, Lighthouse JSON, and sequential claim
output are under `/work/.evidence/homebook-live/` and
`/work/.evidence/final-claim-results.txt`. The catalog description is also at
`/work/.evidence/catalog-description.txt`.

## Run and verify

```sh
npm ci
npm audit
npm test
npm run typecheck
npm run lint
npm run build
npm run test:e2e
```

To verify a claim exactly, run its `test` command from
`.factory/claims.json`. Production output is `dist/`, with `index.html` at its
root.

## Asset provenance

The evidence-vault hero is the existing product-original generated asset from
28 August 2026. Its source, prompt, generator metadata, review notes, and
license are recorded in `assets/src/` and `.factory/design.md`. The social
image is a deterministic 1200×630 crop of that reviewed source. The PWA mark
is hand-authored for this product. No new model generation was needed during
this repair.

## Known gaps and dependencies

- Sociobot billing registration is absent. Paid access must not be advertised
  until the product is registered and its real hosted checkout and return flow
  are tested. The current free product is complete without it.
- Insurer rules and valuation methods vary. Homebook does not submit claims,
  confirm values, provide insurance advice, or guarantee acceptance.
- Local browser storage has no cloud copy by design. Users must keep an
  encrypted backup elsewhere and retain its passphrase.
- Automated browser coverage uses Chromium. A physical iOS Safari and Android
  install/camera/file-import smoke test remains advisable before a broad
  launch; no physical-hardware result is claimed here.
- The referenced `/work/.evidence/qa-result.json` was not present in the
  worker filesystem. The repository's complete review and verification
  reports through `ddd1d83` were available, read, and dispositioned above.
