# Claim-Ready Homebook

Claim-Ready Homebook is a private, offline-first household inventory for renters and homeowners. It keeps item photos, receipt files, values, dates, serials, room locations, and container locations together before a stressful loss. Records stay in the browser; no account or cloud catalogue is required.

The app creates:

- a free CSV claim list;
- a free unencrypted JSON backup for inspection;
- a free AES-GCM encrypted `.homebook` backup containing records and attachments;
- a photo-rich PDF claim packet with the one-time Claim Pack unlock.

It does not submit insurance claims, guarantee values or coverage, provide cloud backup, or give insurance advice.

## Run locally

Requires Node.js 20 or later.

```sh
npm install
npm run dev
```

Vite prints the local development URL. All runtime assets are local; there are no CDN fonts, scripts, analytics, or advertising.

## Test and build

```sh
npm test
npm run build
npm run test:e2e
```

`npm run build` is the production build command. It writes the static deployment to `dist/`, with `dist/index.html` at the root and route fallbacks for `/export`, `/guide`, `/privacy`, and `/terms`.

Playwright is pinned to 1.58.2. The end-to-end suite checks the main workflow on desktop Chromium and a 390px mobile viewport, encrypted backup recovery, PDF/CSV downloads, serious accessibility findings, console errors, persistence, and an offline reload.

## Data and encryption

Inventory records and binary attachments use IndexedDB. Encryption happens locally with Web Crypto: PBKDF2-SHA-256 (250,000 iterations, random 16-byte salt) derives an AES-256-GCM key with a random 12-byte IV. Passphrases are never stored and cannot be recovered. An encrypted export is only a backup after it has been copied away from the original device and tested.

## Paid unlock configuration

Claim Pack uses Sociobot billing only. The product slug is the repository slug, not a hard-coded billing product ID. Production defaults to `https://api.sociobot.in`; staging can override it at build time:

```sh
VITE_BILLING_BASE=https://pilot-api.sociobot.in npm run build
```

The app accepts a returned `?license=` token, stores it under `sb_license:claim-ready-homebook`, strips it from the URL, and verifies at most daily. Core inventory and portable data exports are free.

## Deploy

Publish the contents of `dist/` as a static site. Configure long-lived immutable caching for hashed files under `dist/assets/`, short caching for `index.html` and `sw.js`, and HTTPS so service workers and Web Crypto are available.

The product brief is in [`.factory/brief.json`](.factory/brief.json), the visual system and asset provenance are in [`.factory/design.md`](.factory/design.md), and the build handoff is in [`.factory/handoff.md`](.factory/handoff.md).

## License

MIT — see [`LICENSE`](LICENSE).
