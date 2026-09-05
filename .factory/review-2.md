# Review: Build a portable home inventory for insurance claims

**Verdict: PASS — 0 findings; 0 untested public claims.**

Reviewed 5 September 2026 at `https://claim-ready-homebook.sociobot.in`.

- Job: Build a portable home insurance record with belongings, proof, values, and locations before a loss.
- Audience: Renters and homeowners preparing that evidence.
- First action before scrolling: **Try it with sample data**. It opens three realistic records in a separate demo.

The implementation reviewed is `b35b74bda20f787b474da93cd577c9be6e6b9d3e`.
The documentation baseline was `7c9d45d11d4485e5cdbb15a81d7e14f9632bb079`;
it contains verification reports only after the implementation candidate. A
clean candidate build matched the live `index.html`, application JavaScript,
CSS, service worker, and manifest by SHA-256.

## Result

There are no findings of any severity. The app completes the stated job:
people can record item details, proof, and locations locally, then export CSV,
JSON, encrypted backups, and a PDF claim packet without an account. The demo
is isolated and does not change normal data. No capability stated publicly was
missing a registered, executable claim test.

## Clean checkout and claims

I cloned the current `main` branch into a new temporary directory, ran `npm
ci`, and ran all declared quality checks from that clean checkout. `npm audit`
reported zero vulnerabilities.

| Check | Result |
| --- | --- |
| `npm test` | Pass, 5/5 |
| `npm run typecheck` | Pass |
| `npm run lint` | Pass |
| `npm run build` | Pass; produced `dist/index.html` |
| `npm run test:e2e -- --reporter=line` | Pass, 30/30 desktop and phone Chromium tests |
| `@claim:demo-isolation` | Pass individually |
| `@claim:offline-reload` | Pass individually |
| `@claim:local-only` | Pass individually |
| `@claim:csv-export` | Pass individually |
| `@claim:inventory-records` | Pass individually |
| `@claim:json-export` | Pass individually |
| `@claim:encrypted-backup` | Pass individually |
| `@claim:pdf-export` | Pass individually |
| `@claim:fifty-item-portability` | Pass individually in 25.2 seconds |
| `@claim:remove-undo` | Pass individually |

The ten entries in `.factory/claims.json` map one-to-one to tagged browser
outcome tests. I cross-checked the landing page, inventory, export, guide,
privacy, terms, and README. Statements about offline use, local-only records,
the demo, attachments, exports, encryption, free PDF output, 50-item transfer,
and undo are covered. The remaining statements are clear non-goals or legal
limits, not promises of an untested capability.

## Live checks

Fresh 1440 × 1000 desktop and 390 × 844 phone contexts both loaded at scroll
position zero with the job heading, renter/homeowner audience sentence, and
sample action visible. There were no console or page errors.

On a fresh desktop context, the sample action opened `/demo`; its persistent
**Demo — sample data, nothing is saved** label and three seeded records were
visible. I added a demo-only record, reset the demo to three records, selected
**Start for real**, and returned to an unchanged empty normal inventory. The
runtime request log contained only `https://claim-ready-homebook.sociobot.in`.

The factory URL verifier passed: HTTP 200, title, `lang="en"`, one `h1`, a
main landmark, complete image alternatives, labelled buttons, and no console
errors. Axe scans on `/demo`, `/export?demo=1`, `/guide`, `/privacy`, and
`/terms` at phone size found no serious or critical violations. Route titles
and headings were specific to each page. Every collected same-origin public
link returned HTTP 200. A direct request to `/strict-review-missing` returned
the expected HTTP 404 and displayed the designed **Page not found** page with
a return link.

Keyboard testing put the skip link first, returned focus to the add-item
opener after Escape, and focused the restored route heading after browser Back.
At 200% root text, the 390 px demo stayed 390 px wide. Reduced motion set the
button transition to `0.00001s`. In a fresh phone context after service-worker
control, `/demo` reloaded offline, displayed **Offline • records still
available**, and exported `homebook-claim-list-2026-09-05.csv`.

Mobile Lighthouse 13.4.1 scored **100 performance, 100 accessibility, 100
best practices, and 100 SEO** (FCP 1.0 s, LCP 1.1 s, TBT 0 ms, CLS 0). The
clean build contains 43.38 KB JavaScript (15.29 KB gzip) and 20.30 KB CSS
(5.46 KB gzip) on the initial route. The PDF library is deferred.

This is a static PWA with no backend, so tenant isolation, restart
persistence, health endpoint, and 429/Retry-After checks do not apply. It is
not a CLI, library, or desktop artifact.

## Earlier finding disposition

| Earlier item | Current disposition |
| --- | --- |
| Immutable cache defect | Fixed; clean/live asset hashes match and deployment checks pass. |
| F01 demo missing or changed normal storage | Fixed; live demo/reset/start-real flow and isolated claim pass. |
| F02 broken paid checkout | Fixed honestly; no unregistered checkout is advertised and PDF export is free. |
| F03 absent claim registry and tests | Fixed; ten registered claims pass individually. |
| F04 populated contrast | Fixed; populated demo Axe coverage passes. |
| F05 200% text overflow | Fixed; live 390 px check passes. |
| F06 dialog and history focus | Fixed; live keyboard checks pass. |
| F07 stale route titles and headings | Fixed; live route checks pass. |
| F08 unknown URL returned the app | Fixed; direct request returns designed HTTP 404. |
| F09 first-screen and plain-words defects | Fixed; live first screen and copy audit pass. |
| F10 update removed an open draft | Fixed; full desktop/mobile regression passes. |
| F11 failed import lost the retry state | Fixed; encrypted-backup claim passes. |
| F12 undersized targets | Fixed; full mobile regression passes. |
| F13 missing metadata, shell, and CSP | Fixed; live verifier, metadata, headers, sitemap, and common shell pass. |
| Physical iOS/Android install smoke | Still not claimed as complete; Chromium mobile is adequate for the current public claims. |

Evidence is retained in `/work/.evidence/review-2/`, including URL-verifier
output, desktop and phone screenshots, and the Lighthouse JSON. No product
code was changed during this review.
