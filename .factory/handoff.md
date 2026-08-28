# Claim-Ready Homebook — build handoff

## Repair verification status: PASS

The independent report at `ae235b98df4b4b434ad529fb836f8232ad6e8bb6` found one release blocker in candidate `3a51c7629b8a23819f93fcdf0fa0c273b1751713`: Azure Static Web Apps had no repository-supplied cache policy, so even static assets were served with `Cache-Control: public, must-revalidate, max-age=30`.

Repair commit `28c57edc6c0698b688ffec635c79656045674c7b` adds the Azure Static Web Apps configuration, moves the responsive hero into Vite’s content-fingerprinted asset pipeline, and precaches the emitted image URLs. It was pushed to `main` and deployed to `https://claim-ready-homebook.sociobot.in` on 2026-08-28. Live SHA-256 checks matched local `index.html`, `sw.js`, manifest, primary JS/CSS, and mobile WebP exactly.

The regression is covered twice: `src/deployment.test.ts` asserts the immutable/revalidation policy, and `scripts/verify-deployment.mjs` runs as part of `npm run build`, failing the build if the generated deployment config is absent, a shell response can become immutable, or a cacheable JS/CSS/hero asset lacks a fingerprint.

## What shipped

- A production Vite + TypeScript offline PWA for household claim preparation.
- IndexedDB inventory records with item name, category, value, purchase date, serial/model, room, container/exact location, notes, photo, and receipt/PDF attachment.
- Add, edit, search, room filter, completeness gaps, readiness score, currency selection, confirmed removal, and 8-second undo.
- Local image downscaling before storage; no account, analytics, CDN, cloud storage, or third-party runtime assets.
- Free CSV, unencrypted JSON, and encrypted `.homebook` exports. Encrypted backups include binary attachments and use PBKDF2-SHA-256 (250,000 iterations) plus AES-256-GCM with random salt/IV.
- Backup import on another device, with merge-by-ID or explicit replace behavior and clear passphrase/file errors.
- $19 one-time Claim Pack flow through the Sociobot API contract: hosted checkout, query-token capture and URL cleanup, local license restore, daily-cached verification, offline optimistic unlock, revocation handling, and a photo-rich on-demand PDF builder. Core data and ownership exports remain free.
- Install manifest, 192/512/maskable icons, versioned app-shell service worker, generated build-asset precache, cache-first offline navigation, offline status, update notice, and standalone-safe layout.
- Purpose-built night-market neon visual system, original generated evidence-vault hero, original hand-authored mark, responsive desktop/390px layouts, reduced-motion treatment, designed focus states, and semantic routes.
- `/guide`, `/privacy`, and `/terms`, plus static fallback HTML at those output paths.

## Run and verify

```sh
npm ci
npm test
npm run typecheck
npm run lint
npm run build
npm run test:e2e
```

Production output is exactly `dist/`, with `dist/index.html` at its root. Staging billing can be built with `VITE_BILLING_BASE=https://pilot-api.sociobot.in npm run build`; production defaults to `https://api.sociobot.in`.

Repair verification completed 28 August 2026:

- Clean `npm ci` completed. `npm audit --omit=dev`: **0 production vulnerabilities**.
- `npm test`: **4/4** tests passed, including the new static deployment cache-policy regression.
- `npm run typecheck` and `npm run lint` (strict TypeScript static analysis): passed.
- `npm run build`: passed, produced `dist/` with `dist/index.html`, and passed the generated-deployment guard.
- `npm run test:e2e`: 8/8 passed using Playwright 1.58.2 on desktop Chromium and a 390×844 mobile Chromium viewport.
- Browser coverage includes create/persist/filter, CSV download, encrypted export, decrypt/import into a fresh browser context, PDF download with cached license, automated axe scan, no console errors, and explicit `context.setOffline(true)` reload after service-worker installation.
- Live `/opt/fleet/lib/verify-url.sh`: HTTP 200, title and `lang` present, exactly one `<h1>`, main landmark present, 0 missing image alts, 0 unlabelled buttons, 0 console/page errors.
- Live desktop 1440×1000 and mobile 390×844 scans of `/`, `/export`, `/guide`, `/privacy`, and `/terms`: 0 serious/critical Axe findings and 0 console/page errors. The first Tab reaches the `#main` skip link with a 3px outline; no keyboard trap was found.
- Live PWA: manifest has the expected name, short name, standalone display, start URL, and three icons; after service-worker control, an offline reload still shows the main content and offline status. The worker is versioned and retains `skipWaiting`, `clients.claim`, and its update-ready message.
- Live privacy/response policy: the exercised app requested only `https://claim-ready-homebook.sociobot.in`; there are no CDN assets or analytics. HTTPS responses include HSTS, `nosniff`, and strict-origin referrer policy; the document CSP restricts connections to self plus the documented Sociobot billing origins.
- Live cache headers: `/assets/index-BcpFcm3D.js`, `/assets/index-Ck3cpOxH.css`, and `/assets/evidence-vault-768-BnAfQkuy.webp` return `public, max-age=31536000, immutable`; `/`, `/export`, `sw.js`, and `offline.html` return `public, max-age=0, must-revalidate`.
- Lighthouse 13.4.1 on the repaired live URL: Performance **100**, Accessibility **100**, Best Practices **100**, SEO **100**; FCP **0.9s**, LCP **1.1s**, TBT **0ms**, CLS **0**.
- Production sizes: initial application JS **38.26 KB** (**14.14 KB gzip**), CSS **17.63 KB** (**4.98 KB gzip**), mobile AVIF hero **17 KB**, mobile WebP fallback **28 KB**. The larger PDF libraries are dynamically loaded only when an unlocked user builds a PDF. There is no package/consumer artifact beyond this static PWA.

Local reports and screenshots were generated under `.factory/evidence/` and intentionally ignored from git. The app was visually reviewed at 1440×1000 and 390×844.

## Asset provenance

The hero source is `assets/src/evidence-vault.png`; its full prompt/review is in `assets/src/evidence-vault.prompt.json` and the generator response metadata is beside it. It was generated on 28 August 2026 with the factory Azure image deployment through `/opt/fleet/lib/gen-image.sh`, reviewed for text/brand/anatomy artifacts, then converted locally to responsive AVIF and WebP. The responsive derivatives now live under `src/assets/` so Vite emits content-fingerprinted filenames; the shipped mobile variants are below the 300 KB budget. The PWA mark is the project-authored `assets/src/homebook-mark.svg`. Full art direction and licensing are in `.factory/design.md`.

## Known gaps and release notes

- The factory must register `claim-ready-homebook` with Sociobot billing and configure its return URL before a real purchase can complete. No product ID or payment-provider credential is embedded here.
- Insurer requirements and valuation rules differ; the UI and PDF state this explicitly. Homebook does not submit claims or guarantee acceptance.
- Data has no cloud copy by design. Users must move an encrypted export off the original device and retain its passphrase.
- Automated browser coverage is Chromium-based. The implementation uses evergreen Web APIs and should receive a final physical-device smoke test on iOS Safari before a broad launch.
- `npm audit` including development-only build/test tools reports 3 advisories (two high and one critical); the production-only audit is clean. They are not shipped in the static runtime.

## Suggested next steps

1. Register the production and staging billing products and run the hosted checkout return flow with a real test license.
2. Run one physical iPhone install/camera/file-import smoke test and one Android install/offline smoke test.
