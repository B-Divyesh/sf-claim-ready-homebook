# Claim-Ready Homebook

Build a private home inventory before an insurance loss. Claim-Ready Homebook is for renters and homeowners who need portable records of belongings and proof.

It stores values, serial numbers, photos, receipts, rooms, and storage places.

Try the isolated sample at `/demo`. It starts with three records, stays separate from the normal inventory, and needs no account.

The app exports CSV, JSON, an encrypted `.homebook` backup, and a PDF claim packet. It does not submit claims, confirm values, provide cloud backup, or guarantee that an insurer accepts evidence.

All current exports are free. Paid checkout is not offered because the billing product is not registered.

## Run locally

Use Node.js 20 or later.

```sh
npm ci
npm run dev
```

Vite prints the local URL. Open `/demo` for the sample.

## Test and build

```sh
npm test
npm run typecheck
npm run lint
npm run build
npm run test:claims
npm run test:e2e
```

Playwright is pinned to 1.58.2. The browser tests cover desktop Chromium and a 390 × 844 mobile viewport. Claim tests run from the isolated demo in a fresh Chromium context.

Every public product claim is listed in [`.factory/claims.json`](.factory/claims.json). Each entry names one tagged command that checks the user-visible result. The 50-item check creates records through the interface, exports an encrypted backup, and imports it in another browser profile within ten minutes.

## Data and encryption

Normal records use the `claim-ready-homebook` IndexedDB database. Demo records use `claim-ready-homebook-demo`. **Start for real** clears demo records before opening the normal inventory.

Encryption runs in the browser. PBKDF2-SHA-256 uses 250,000 iterations, a random 16-byte salt, and a user passphrase to derive an AES-256-GCM key. Each export has a random 12-byte IV. The passphrase is never stored, so keep it somewhere safe.

The app has no account, analytics, advertising, CDN assets, or cloud inventory service. See the in-app `/privacy` and `/terms` pages.

## Deploy

```sh
npm run build
```

Publish `dist/` as the static site root. Keep the generated route files and `staticwebapp.config.json` beside `index.html`.

The product brief is in [`.factory/brief.json`](.factory/brief.json). The visual system and asset provenance are in [`.factory/design.md`](.factory/design.md). Demo behavior is in [`.factory/demo.md`](.factory/demo.md).

## License

MIT. See [`LICENSE`](LICENSE).
