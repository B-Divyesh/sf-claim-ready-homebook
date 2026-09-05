# Review: Build a portable home inventory for insurance claims

**Verdict: FAIL — 13 findings, including 3 high severity, and 12 untested public claims.**

Reviewed 5 September 2026 at `https://claim-ready-homebook.sociobot.in`.

- Job: Record belongings, proof, values, and locations, then move a claim packet to another device.
- Audience: Renters and homeowners preparing evidence before an insurance loss.
- First action before scrolling: The live page offers **Add your first item**. It does not offer the required **Try it with sample data** action.

The implementation reviewed is `28c57edc6c0698b688ffec635c79656045674c7b`. The documentation checkout is `692b25273c8b6f1e75597ba661e289c1b51f4ab8`. The commits between them change only `.factory/handoff.md` and `.factory/verification-2.md`. SHA-256 comparisons show that the live `index.html`, service worker, manifest, primary JS, primary CSS, and mobile WebP are byte-for-byte matches for the build from implementation commit `28c57ed`.

## Findings

### F-01 — High — The required sample mode is absent and the demo URL uses real storage

The first screen has no **Try it with sample data** action. Both `/demo` and `/?demo=1` open the normal inventory. A record created in the normal inventory appeared at `/demo`. In a separate fresh context, a record entered from `/demo` persisted at `/` in the same `claim-ready-homebook` IndexedDB database. There is no persistent demo label, **Reset demo**, or **Start for real** action. `.factory/demo.md` is also absent.

This fails the one-click sample and storage-isolation contract. A catalog visitor who believes `/demo` is disposable can change normal browser data.

### F-02 — High — The paid purchase path is broken

The live export page advertises **Claim Pack • $19 once** and links to the production Sociobot checkout. On 5 September 2026 that exact link returned HTTP 404 with `{"error":"enabled factory product","status":404}`. A buyer cannot purchase the advertised PDF feature. This was already listed as a registration gap in the prior handoff and remains unresolved on the public site.

### F-03 — High — Public claims have no claim registry or tagged tests

`.factory/claims.json` does not exist and the repository contains no `@claim:` test. There were therefore no declared claim commands to run. The normal test suite passes, and several promises also passed ad hoc live checks, but neither satisfies the required claim-to-test mapping.

Twelve distinct public promises remain untested under the claims contract:

1. The app works offline after the first visit.
2. Inventory stays in the browser without an account or cloud copy.
3. Runtime assets are local, with no advertising, analytics, CDN fonts, or tracking; only billing actions contact Sociobot.
4. CSV exports every record field with one row per record.
5. JSON export carries records and attachments.
6. An encrypted backup carries records, photos, and receipts to another device and rejects a wrong passphrase.
7. Encryption uses PBKDF2-SHA-256 with 250,000 iterations, random salt, AES-256-GCM, and a random IV.
8. Passphrases are never stored and cannot be recovered.
9. Claim Pack creates the described photo-rich PDF pages and index.
10. Claim Pack costs $19 once, gives permanent access while valid, and has no subscription.
11. A returned license is stored, removed from the URL, and verified no more than daily.
12. Fifty items can be exported in under ten minutes and opened on a second device without an account.

Current ad hoc browser checks passed promises 1–4, 6, and 12 in the tested Chromium environment. Source inspection supports 5, 7, 8, and 11. The bundled PDF test seeds a cached license and checks only the filename, not the claimed PDF contents. Promise 10 fails at the live checkout. All 12 remain unlisted and lack the required tagged sandbox test.

### F-04 — Medium — A populated record has a serious contrast failure

Axe on a populated live inventory reports one serious `color-contrast` violation. The **No photo** label renders at 4.12:1 (`#59636c` over `#dcd3c3`) where 4.5:1 is required. The bundled Axe test visits only `/privacy`, so it does not cover this normal populated state.

### F-05 — Medium — Text resized to 200% causes horizontal loss

At a 390 × 844 viewport with root text resized to 200%, the document becomes 513 px wide. The device state, primary navigation, Guide link, skip link, and update toast extend beyond the 390 px viewport. Normal-size desktop and phone layouts do not overflow.

### F-06 — Medium — Dialog and history navigation do not restore focus

The add dialog correctly places focus in **Item name**, but Escape closes it while focus remains on the now-hidden input instead of returning to the action that opened it. Going from Inventory to Export and then Back leaves focus on `BODY`; it does not move to the restored page heading or announce the route. The first Tab and skip link do pass, with a 3 px focus outline.

### F-07 — Medium — Route titles and page headings do not identify each page

Every tested route uses `Claim-Ready Homebook — private home inventory`. Privacy, Terms, Guide, and Export do not set their own titles. The sole `h1` is the product wordmark on every route; the page job is an `h2`. This fails the route-title and page-heading contract even though the raw count is one `h1`.

### F-08 — Medium — There is no real 404 response or designed 404 page

`/definitely-missing-review-path` returns HTTP 200 and renders the inventory. This is not a deliberate 404; it is an unknown route being silently treated as home. The required designed 404 and return path are absent.

### F-09 — Medium — The first screen and landing page do not meet the plain-words structure

The visible headline is 11 words, above the nine-word limit, and the supporting sentence does not name renters or homeowners. The required sample action and adjacent explanation are missing. The landing route ends after the hero, so it has no in-page product preview, three-step **How it works**, limitations/privacy section, or exact paid tier section. Labels such as **Your proof, before you need it**, **Portable by design**, **Capture proof while the room is ordinary**, and **The stall is offline** use the metaphor/mood style prohibited by the contract. `.factory/copy-audit.md` is absent.

### F-10 — Medium — A service-worker update can erase an unsaved item draft

The earlier update finding is still open. With an add dialog open and **Unsaved television draft** entered, delivery of the live worker's `UPDATE_READY` message closed the dialog and removed the draft. The update toast was shown. This loses unsaved work and also appears over first-load phone content.

### F-11 — Low — A failed encrypted import discards the retry state

The earlier import finding is still open. A wrong passphrase shows the correct error, but the **Move or restore a homebook** disclosure closes and the selected file count returns to zero. Recovery requires reopening the panel and selecting the file again.

### F-12 — Low — Some interactive targets are below 44 px

In the populated inventory, **Edit** and **Remove** are 40 px high. The footer **Terms** link is 40 px wide. These miss the 44 × 44 px target baseline.

### F-13 — Low — Required site metadata and common structure are incomplete

The live document has no canonical URL, Open Graph metadata, Twitter card, or 1200 × 630 social image. It uses the 192 px icon as the Apple touch icon rather than supplying the required 180 px asset. The sitemap omits `/export` and the required demo route. The header omits Demo and Privacy, while the footer omits **Built by Param Factory** and a build identifier. Live headers have no response-header CSP or `frame-ancestors` policy; the meta CSP cannot provide framing protection.

## Earlier finding disposition

| Earlier item | Current disposition | Evidence |
| --- | --- | --- |
| Hashed assets used a 30-second cache | Fixed | Live JS, CSS, and sampled hashed WebP return `public, max-age=31536000, immutable`; shell and worker revalidate. Local and live bytes match. |
| Wrong-passphrase import closes and clears recovery controls | Open | Reproduced as F-11. |
| Update notice can dismiss an open add dialog | Open | Reproduced as F-10 with the worker message event and a filled draft. |
| Billing product still needed registration | Open and user-visible | The production buy link returns 404; recorded as F-02. |
| Physical iOS/Android smoke test was pending | Not claimed as completed | This review used fresh desktop Chromium and a fresh 390 × 844 mobile Chromium context. |

## Functional and boundary evidence

- Fresh desktop 1440 × 1000 and phone 390 × 844 sessions loaded without console or page errors.
- Blank item names and `-0.01` values were rejected. The documented maximum value `100000000` was accepted.
- A realistic record persisted across reload. Search/filter behavior passed in the bundled suite.
- Fifty records were created through the live UI in 17.464 seconds. The page showed `Showing 50 of 50 items` before and after reload.
- CSV contained 50 data rows. JSON reported format `claim-ready-homebook` and 50 items.
- An encrypted backup restored all 50 records on a fresh mobile context. The imported camera retained `camera-proof.png` and `camera-receipt.pdf`.
- Remove reduced the count to 49; **Undo** restored 50.
- A wrong passphrase was rejected. Correct-passphrase recovery worked in the separate import run.
- The exercised inventory/export flow contacted only `https://claim-ready-homebook.sociobot.in`. No analytics or third-party runtime request appeared.
- In a dedicated browser context, the installed service worker controlled the page and an offline reload kept `main` visible with **Offline • records still available**.
- Reduced-motion emulation matched and reduced transitions/animations to `0.01ms` with automatic scrolling.
- All normal internal links tested returned 200. The production checkout was the only broken linked path.
- No backend is part of this static PWA, so tenant isolation, restart persistence, health, and 429 checks do not apply. No CLI/library/desktop artifact is shipped.

## Clean checkout commands

A fresh clone at documentation commit `692b252` was installed with `npm ci`.

| Command | Result |
| --- | --- |
| `npm test` | Pass: 4/4 Vitest tests |
| `npm run typecheck` | Pass |
| `npm run lint` | Pass |
| `npm run build` | Pass; `dist/index.html` produced |
| `npm run test:e2e -- --reporter=list` | Pass: 8/8 Chromium tests |
| `npm audit --omit=dev` | Pass: 0 production vulnerabilities |
| Factory `verify-url.sh` | Pass: HTTP 200, title, `lang=en`, one raw `h1`, main, alt/button checks, no console errors |
| Live Playwright Axe scan | Fail in populated inventory: one serious contrast violation; other tested routes had none |
| Lighthouse 13.0.1, live mobile | 100 performance, 100 accessibility, 100 best practices, 100 SEO; FCP 0.9 s, LCP 1.2 s, TBT 0 ms, CLS 0 |

`npm ci` reports three development-tool advisories (two high and one critical); `npm audit --omit=dev` reports none. Initial app JS is 38,264 bytes (14.14 KB gzip), CSS is 17,626 bytes (4.98 KB gzip), and the mobile AVIF/WebP assets are 16,840/27,876 bytes. The initial bundle and measured performance stay within budget. Lighthouse evaluates the empty route and therefore does not contradict the populated-state Axe failure.

Evidence files are under `.factory/evidence/` and are intentionally ignored from git. No product code was changed during this review.
