# Independent verification 2 — Claim-Ready Homebook

**Result: PASS, with two low-severity recovery/UI defects recorded below.**

Verified on 2026-08-28 from a clean checkout at candidate commit
`b2f1cd034693f86cde16d6d746ecd86a101e1f01` against the deployed product at
`https://claim-ready-homebook.sociobot.in`.

The prior cache-policy release blocker is repaired. The locally built shell,
worker, manifest, primary JS/CSS, and responsive WebP matched the live files
byte-for-byte by SHA-256. This is the same deployable product as the candidate.

## Quality gates

- `npm ci`: completed from the clean checkout.
- `npm test`: **4/4** Vitest tests passed.
- `npm run typecheck` and `npm run lint`: passed (both strict TypeScript
  checks).
- `npm run build`: passed and produced `dist/`; the deployment cache-policy
  guard passed.
- `npm run test:e2e -- --reporter=list`: **8/8** Chromium Playwright tests
  passed across desktop and the configured 390 x 844 mobile project. These
  include persistence, CSV/PDF/encrypted export, fresh-context import, axe,
  console errors, and controlled offline reload.
- `npm audit --omit=dev`: **0** production vulnerabilities. `npm ci` reports
  three development-tool advisories (two high, one critical), not shipped in
  the static app.

## Product evidence

- Normal workflow: added a named camera with a zero value, room and container;
  it persisted and exported a `homebook-claim-list-2026-08-28.csv` file.
- Boundaries and validation: blank name is invalid; `0` and `100000000` are
  valid values; `-0.01` and `100000000.01` are invalid; a nine-character
  backup passphrase is invalid.
- Portability: an encrypted `.homebook` exported and restored in a fresh
  browser profile. A deliberately wrong passphrase shows “That passphrase did
  not open this backup, or the file is damaged”; reopening the restore panel,
  choosing the file again, and entering the right passphrase restored the
  record. A photo and receipt attachment also survived this encrypted
  export/import path.
- Scale: after allowing the initial service-worker update message to settle,
  50 records were created through the UI in **16.9 seconds**; the page showed
  `Showing 50 of 50 items`, and CSV export completed. This is well within the
  under-ten-minute success measure.
- PWA: the live app registered and was controlled by `sw.js` at the expected
  scope. After worker control and reload, `context.setOffline(true)` still
  reloaded `<main>` and displayed `Offline • records still available`, with no
  errors. The worker is versioned, precaches the built shell/assets, calls
  `skipWaiting` and `clients.claim`, and posts its update-ready message.

## Accessibility and responsive checks

- Axe scans of `/`, `/export`, `/guide`, `/privacy`, and `/terms` at desktop
  1440 x 1000 and mobile 390 x 844 found **0 serious/critical** violations.
- Every checked route had exactly one `h1`, one `main` landmark, a title, no
  horizontal overflow, and no console/page errors.
- Keyboard-only smoke: first Tab reaches `Skip to main content` (`#main`) and
  its computed outline is 3px. The exercised dialogs and controls had no
  keyboard trap. CSS has a reduced-motion override for all animations and
  transitions.
- Live Lighthouse 13.4.1 (headless Chromium): Performance **98**,
  Accessibility **100**, Best Practices **100**, SEO **100**; FCP **0.9 s**,
  LCP **1.1 s**, TBT **170 ms**, CLS **0**.

## Privacy, browser policy, cache, and budget evidence

- A clean live-browser run that created/exported inventory requested only
  `https://claim-ready-homebook.sociobot.in`. Source and runtime inspection
  found no analytics, third-party fonts, CDN assets, or inventory upload. The
  only external endpoint in source is the documented Sociobot license
  verification/checkout flow, activated only by that paid action.
- CSP is present in the document and restricts scripts/styles to self and
  connections/forms to self plus the two documented Sociobot billing origins.
  Live responses include HSTS, `X-Content-Type-Options: nosniff`, and
  `Referrer-Policy: strict-origin-when-cross-origin`.
- Live `/`, `/export`, `sw.js`, and `offline.html` return
  `Cache-Control: public, max-age=0, must-revalidate`. The sampled hashed JS,
  CSS, and WebP assets return
  `Cache-Control: public, max-age=31536000, immutable`.
- Initial app JS is **38.26 KB** raw (**14.14 KB gzip**) and CSS is **17.63
  KB** raw (**4.98 KB gzip**), under the 200 KB / 50 KB static budgets. The
  768px AVIF/WebP hero variants are 16.84 KB / 27.88 KB. PDF libraries are
  emitted as on-demand chunks rather than initial application code.

## Defects

### Low — failed backup import resets the restore disclosure

On a wrong-passphrase import, the error toast causes a full render. The
“Move or restore a homebook” `<details>` panel closes and the browser clears
the file field. Recovery succeeds, but the person must reopen the panel,
choose the same file again, and re-enter the passphrase. Preserve the panel’s
open state (and explain unavoidable file reselection) when reporting the
error.

### Low — update-ready toast can dismiss an open add-item dialog

The service worker’s initial `UPDATE_READY` message calls the global render
function. In a fresh profile, rapidly creating records before that message
settled intermittently replaced an open add-item dialog; the unsaved form is
lost. Waiting for the initial message, then adding 50 records, was reliable.
Render the update notice without replacing an open dialog, or preserve its
draft fields across that render.

Neither issue loses already-saved inventory, blocks exports/imports, nor
prevents the core claim-packet workflow. They should be fixed as polish before
the next release but do not change this candidate’s PASS result.
