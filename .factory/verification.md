# Independent verification — Claim-Ready Homebook

**Result: FAIL (deployment configuration)**

Verified 2026-08-28 from clean candidate checkout at commit `3a51c7629b8a23819f93fcdf0fa0c273b1751713` against `https://claim-ready-homebook.sociobot.in`.

The application code and live artifact are functionally sound in the coverage below. The release fails the factory PWA caching requirement because immutable, content-hashed assets are served with a 30-second revalidation policy. This is a deployment-only defect; no product source was changed during verification.

## Blocking defect

### Medium — hashed static assets are not immutably cached in production

The production host returned the following header for all sampled immutable assets:

```
Cache-Control: public, must-revalidate, max-age=30
```

Samples: `/assets/index-okQeZQ6A.js`, `/assets/index-Ck3cpOxH.css`, and `/assets/evidence-vault-768.webp`. The same policy is used for HTML, `sw.js`, and `offline.html`.

This contradicts the PWA performance contract and the repository's own deploy instructions: hashed `dist/assets/*` files should have long-lived immutable caching, while `index.html` and `sw.js` should be short-cached. It needlessly revalidates the application shell and image on each revisit, undermining the offline/performance release target. Configure the static host to return, for example, `public, max-age=31536000, immutable` for content-hashed assets, and retain short revalidation for HTML and the service worker. Re-run header checks after deployment.

## Evidence of work performed

### Clean checkout and local quality gates

- Checkout was clean and at the requested SHA before testing.
- `npm ci`: completed. `npm audit --omit=dev`: **0 production vulnerabilities**.
- `npx tsc --noEmit`: passed.
- `npm test`: passed, **3/3** Vitest tests.
- `npm run build`: passed and produced `dist/`.
- `npm run test:e2e -- --reporter=list`: passed, **8/8** Playwright tests on desktop Chromium and the configured 390 x 844 mobile project. This covers record creation/persistence/filtering, CSV/PDF/encrypted export, decrypt and import in a fresh context, axe, console errors, and offline reload.
- No lint script is declared in `package.json`.

`npm audit` including development-only tooling currently reports 3 advisories (one critical for Vitest UI, two high for Sharp/Vite). They are not shipped in the static runtime; production dependency audit is clean. Upgrade those build tools separately.

### Product and boundary exercise

- Confirmed the empty state, keyboard activation of **Add your first item**, a mobile 390px record flow, a minimum-value item (`0`), and the permitted maximum item value (`100000000`).
- Native form validation blocks a blank item name, a missing encrypted-backup acknowledgement, and a 9-character passphrase. A valid encrypted export and fresh-context import are covered by the passing end-to-end suite.
- Tested 50 persisted IndexedDB records and CSV export in Chromium; the inventory rendered `Showing 50 of 50 items` before export. IndexedDB writes for the 50 records completed in 6 ms in this environment.
- Tested a wrong-passphrase import path and verified that it presents the damaged/wrong-passphrase error. Because the app re-renders to show the toast, browser file selection is cleared; the user must select the backup again before retrying. This is minor recovery friction, not a blocker.
- Manual 390px keyboard smoke: first Tab reaches the skip link and the designed focus outline computes to 3px. No keyboard trap was found in the exercised flow.

### Accessibility, privacy, and browser behavior

- Axe scans of `/`, `/export`, `/guide`, `/privacy`, and `/terms` at desktop 1440px and mobile 390px found **0 serious/critical** violations.
- Those route scans recorded **0 console errors and 0 page errors**.
- The live page has one `h1`, `lang=en`, a title, skip link, `main`, labelled controls, and local self-hosted assets. It has no CDN fonts or runtime analytics.
- A clean live-browser load made requests only to `https://claim-ready-homebook.sociobot.in`; no inventory data was sent externally. Source review confirms Sociobot is contacted only for an explicit checkout/verification action. The document CSP limits connections to self plus the documented Sociobot billing origins.
- The live manifest parsed successfully in Chromium DevTools with no manifest errors. The worker obtained control at `/`; after a controlled reload, `context.setOffline(true)` still reloaded and displayed `main` with no console/page errors. Worker code uses versioned cache names, `skipWaiting`, `clients.claim`, and an update-ready message.

### Deployment identity, headers, and performance

- Live `index.html`, `sw.js`, `manifest.webmanifest`, primary JS, primary CSS, and mobile WebP hero matched the locally built candidate byte-for-byte by SHA-256.
- HTTPS is enabled; observed headers include HSTS, `nosniff`, and strict-origin referrer policy. The CSP is present as a document meta policy rather than an HTTP response header.
- Initial application JS is 38.21 KB raw / 14.07 KB gzip; CSS is 17.63 KB raw / 4.98 KB gzip. The initial JS budget is below 200 KB. PDF libraries are split into on-demand chunks.
- Lighthouse 13.4.1 against the live URL: Performance **100**, Accessibility **100**, Best Practices **100**, SEO **100**; FCP **0.9 s**, LCP **1.1 s**, TBT **0 ms**, CLS **0**.

## Retest condition

Update only the static-host cache policy as described in the Medium defect, deploy, and repeat the sampled `curl -I` checks plus an offline PWA smoke. The candidate otherwise matched the live deployment and passed the stated local/browser checks.
