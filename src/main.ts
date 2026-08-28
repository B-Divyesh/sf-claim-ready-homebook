import './styles.css';
import { db } from './db';
import { createPayload, decryptPayload, encryptPayload, restorePayload } from './crypto';
import { exportCsv, exportJson, exportPdf } from './exports';
import { captureLicense, checkoutUrl, initialLicenseState, storeLicense, verifyLicense } from './license';
import type { BackupPayload, EncryptedBackup, HomeItem, LicenseState, Route } from './types';
import { CURRENCIES, download, escapeHtml, missingEvidence, money, readiness, todayStamp } from './utils';

const app = document.querySelector<HTMLDivElement>('#app')!;
let items: HomeItem[] = [];
let route: Route = routeFromPath();
let query = '';
let roomFilter = '';
let editingId: string | null = null;
let deletedItem: HomeItem | null = null;
let undoTimer = 0;
let notice = '';
let noticeKind: 'info' | 'error' = 'info';
let currency = localStorage.getItem('homebook:currency') || 'USD';
let license: LicenseState = initialLicenseState(captureLicense());
let storageError = '';
let objectUrls: string[] = [];

function routeFromPath(): Route {
  const segment = location.pathname.split('/').filter(Boolean)[0];
  return segment === 'export' || segment === 'guide' || segment === 'privacy' || segment === 'terms' ? segment : 'inventory';
}

function icon(name: 'plus' | 'box' | 'export' | 'shield' | 'edit' | 'trash' | 'search' | 'lock'): string {
  const paths = {
    plus: '<path d="M12 5v14M5 12h14"/>',
    box: '<path d="m4 8 8-4 8 4-8 4-8-4Zm0 0v8l8 4 8-4V8m-8 4v8"/>',
    export: '<path d="M12 3v12m0 0 5-5m-5 5-5-5M5 19h14"/>',
    shield: '<path d="M12 3 5 6v5c0 4.6 2.8 8 7 10 4.2-2 7-5.4 7-10V6l-7-3Zm-3 9 2 2 4-5"/>',
    edit: '<path d="m4 16-.7 4 4-.7L18 8.6 14.4 5 4 16Zm8.8-9.4 3.6 3.6"/>',
    trash: '<path d="M5 7h14m-9 4v5m4-5v5M8 7l1-3h6l1 3m1 0-1 13H8L7 7"/>',
    search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
    lock: '<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>'
  };
  return `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true">${paths[name]}</svg>`;
}

function currentPath(value: Route): string {
  return value === 'inventory' ? '/' : `/${value}`;
}

function setNotice(message: string, kind: 'info' | 'error' = 'info'): void {
  notice = message;
  noticeKind = kind;
  render();
}

function setRoute(next: Route): void {
  route = next;
  history.pushState({}, '', currentPath(next));
  render();
  document.querySelector<HTMLElement>('#main h2, #main .hero-copy')?.focus();
  window.scrollTo({ top: 0, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
}

function filteredItems(): HomeItem[] {
  const needle = query.trim().toLowerCase();
  return items.filter(item => {
    const matchesQuery = !needle || [item.name, item.category, item.room, item.container, item.serial, item.notes].some(value => value.toLowerCase().includes(needle));
    return matchesQuery && (!roomFilter || item.room === roomFilter);
  });
}

function evidenceStatus(item: HomeItem): string {
  const missing = missingEvidence(item);
  if (!missing.length) return '<span class="status status-ready">Ready</span>';
  return `<span class="status status-gap">${missing.length} ${missing.length === 1 ? 'gap' : 'gaps'}</span>`;
}

function summaryMarkup(): string {
  const total = items.reduce((sum, item) => sum + (item.value ?? 0), 0);
  const score = readiness(items);
  return `<aside class="summary-rail" aria-label="Homebook summary">
    <div class="summary-kicker">Readiness</div>
    <div class="score"><strong>${score}</strong><span>%</span></div>
    <progress class="meter" aria-label="Evidence readiness" max="100" value="${score}">${score}%</progress>
    <p>${score === 100 ? 'Every item has the five key evidence fields.' : items.length ? 'Add the missing evidence shown on each record.' : 'Your score grows as you add useful proof.'}</p>
    <dl>
      <div><dt>Items</dt><dd>${items.length}</dd></div>
      <div><dt>Recorded value</dt><dd>${escapeHtml(money(total, currency))}</dd></div>
      <div><dt>With attachments</dt><dd>${items.filter(item => item.photo || item.receipt).length}</dd></div>
    </dl>
    <label class="currency-picker">Value currency<select name="currency" aria-label="Value currency">${CURRENCIES.map(value => `<option ${currency === value ? 'selected' : ''}>${value}</option>`).join('')}</select></label>
    <p class="local-note">${icon('shield')} <span>Saved only in this browser</span></p>
  </aside>`;
}

function heroMarkup(): string {
  return `<section class="hero" aria-labelledby="welcome-title">
    <div class="hero-copy" tabindex="-1">
      <p class="eyebrow">Your proof, before you need it</p>
      <h2 id="welcome-title">Turn a roomful of things into a record you can carry.</h2>
      <p>Photograph belongings, keep serials and receipts together, then make a portable claim packet—without an account or a monthly bill.</p>
      <div class="hero-actions">
        <button class="button button-primary" data-action="add">${icon('plus')} Add your first item</button>
        <a class="text-link" href="/guide" data-route="guide">See the 10-minute method <span aria-hidden="true">→</span></a>
      </div>
      <ul class="trust-list"><li>Works offline</li><li>Local by default</li><li>Exports move with you</li></ul>
    </div>
    <picture>
      <source type="image/avif" srcset="/assets/evidence-vault-768.avif 768w, /assets/evidence-vault-1280.avif 1280w" sizes="(max-width: 760px) 100vw, 52vw">
      <img src="/assets/evidence-vault-768.webp" srcset="/assets/evidence-vault-768.webp 768w, /assets/evidence-vault-1280.webp 1280w" sizes="(max-width: 760px) 100vw, 52vw" width="768" height="512" alt="An open archive case holding blank evidence cards, a camera, and a small house model at a night-market stall" fetchpriority="high" decoding="async">
    </picture>
  </section>`;
}

function itemCard(item: HomeItem): string {
  objectUrls.push(...[item.photo].filter(Boolean).map(blob => URL.createObjectURL(blob!)));
  const imageUrl = item.photo ? objectUrls[objectUrls.length - 1] : '';
  const missing = missingEvidence(item);
  return `<li class="item-slip">
    <div class="item-photo ${imageUrl ? '' : 'photo-placeholder'}">
      ${imageUrl ? `<img src="${imageUrl}" width="180" height="140" alt="Photo of ${escapeHtml(item.name)}" loading="lazy" decoding="async">` : `${icon('box')}<span>No photo</span>`}
    </div>
    <div class="item-body">
      <div class="item-heading"><div><p class="item-category">${escapeHtml(item.category || 'Uncategorised')}</p><h3>${escapeHtml(item.name)}</h3></div>${evidenceStatus(item)}</div>
      <dl class="item-facts">
        <div><dt>Value</dt><dd>${escapeHtml(money(item.value, currency))}</dd></div>
        <div><dt>Location</dt><dd>${escapeHtml([item.room, item.container].filter(Boolean).join(' / ') || 'Not recorded')}</dd></div>
        <div><dt>Serial / model</dt><dd>${escapeHtml(item.serial || 'Not recorded')}</dd></div>
        <div><dt>Purchased</dt><dd>${escapeHtml(item.purchaseDate || 'Not recorded')}</dd></div>
      </dl>
      ${missing.length ? `<p class="evidence-gaps"><strong>Add:</strong> ${missing.map(escapeHtml).join(', ')}</p>` : '<p class="evidence-complete">Five key evidence fields recorded.</p>'}
      <div class="item-actions">
        <button class="button button-quiet" data-action="edit" data-id="${item.id}">${icon('edit')} Edit</button>
        <button class="button button-danger" data-action="delete" data-id="${item.id}">${icon('trash')} Remove</button>
      </div>
    </div>
  </li>`;
}

function inventoryMarkup(): string {
  if (!items.length) return heroMarkup();
  const rooms = [...new Set(items.map(item => item.room).filter(Boolean))].sort();
  const visible = filteredItems();
  return `<div class="workspace">
    ${summaryMarkup()}
    <section class="inventory" aria-labelledby="inventory-title">
      <div class="section-heading"><div><p class="eyebrow">Evidence ledger</p><h2 id="inventory-title" tabindex="-1">Your belongings</h2></div><button class="button button-primary" data-action="add">${icon('plus')} Add an item</button></div>
      <form class="filters" id="filter-form" role="search">
        <label><span>Search records</span><span class="input-with-icon">${icon('search')}<input name="query" type="search" value="${escapeHtml(query)}" placeholder="Name, serial, location"></span></label>
        <label><span>Room</span><select name="room"><option value="">All rooms</option>${rooms.map(room => `<option ${room === roomFilter ? 'selected' : ''}>${escapeHtml(room)}</option>`).join('')}</select></label>
        <button class="button button-secondary" type="submit">Apply filters</button>
      </form>
      <p class="result-count" aria-live="polite">Showing ${visible.length} of ${items.length} ${items.length === 1 ? 'item' : 'items'}</p>
      ${visible.length ? `<ul class="item-list">${visible.map(itemCard).join('')}</ul>` : `<div class="no-results"><h3>No records match</h3><p>Try a different room or clear the search phrase.</p><button class="button button-secondary" data-action="clear-filters">Clear filters</button></div>`}
    </section>
  </div>`;
}

function exportMarkup(): string {
  const empty = !items.length;
  return `<section class="page narrow" aria-labelledby="export-title">
    <p class="eyebrow">Portable by design</p><h2 id="export-title" tabindex="-1">Take your homebook with you</h2>
    <p class="lead">Claim packets are snapshots. Update and export again whenever your records change. Your original data remains on this device.</p>
    ${empty ? `<div class="callout warning"><strong>Nothing to export yet.</strong><p>Add at least one belonging, then return here.</p><button class="button button-primary" data-action="add">Add an item</button></div>` : ''}
    <div class="export-grid">
      <article class="export-option"><div class="option-icon">${icon('export')}</div><div><p class="tag">Free • readable</p><h3>Claim list CSV</h3><p>A spreadsheet-friendly list of every field. Attachments stay in your backup.</p><button class="button button-secondary" data-action="csv" ${empty ? 'disabled' : ''}>Export CSV</button></div></article>
      <article class="export-option"><div class="option-icon">${icon('lock')}</div><div><p class="tag">Free • secure</p><h3>Encrypted portable backup</h3><p>Moves all records, photos, and receipts to another device. Only your passphrase can open it.</p>
        <form id="encrypted-export-form"><label for="backup-passphrase">Passphrase <span class="hint">10+ characters</span></label><input id="backup-passphrase" name="passphrase" type="password" minlength="10" autocomplete="new-password" required><label class="check"><input type="checkbox" required> <span>I understand this passphrase cannot be recovered.</span></label><button class="button button-secondary" ${empty ? 'disabled' : ''}>Download encrypted backup</button></form>
      </div></article>
      <article class="export-option premium"><div class="option-icon">${icon('shield')}</div><div><p class="tag">Claim Pack • $19 once</p><h3>Photo-rich PDF packet</h3><p>A polished item index, room locations, evidence details, and one photo page per item. Permanent access; no subscription.</p>
        ${license.valid ? `<p class="unlocked">✓ Unlocked on this device</p><button class="button button-primary" data-action="pdf" ${empty ? 'disabled' : ''}>Build claim PDF</button>` : `<a class="button button-primary" href="${checkoutUrl}">Buy Claim Pack — $19</a><p class="fine">Checkout and refunds are handled by Sociobot/Dodo, the merchant of record.</p>`}
      </div></article>
    </div>
    <details class="transfer-panel"><summary>Move or restore a homebook</summary><div class="details-body">
      <p>Choose a Homebook <code>.homebook</code> or <code>.json</code> backup. Encrypted backups require the original passphrase.</p>
      <form id="import-form"><label for="import-file">Backup file</label><input id="import-file" name="backup" type="file" accept=".homebook,.json,application/json" required><label for="import-passphrase">Passphrase <span class="hint">Encrypted files only</span></label><input id="import-passphrase" name="passphrase" type="password" autocomplete="current-password"><label class="check"><input name="replace" type="checkbox"> <span>Replace records already on this device</span></label><button class="button button-secondary">Import backup</button></form>
      <hr><p><strong>Unencrypted JSON</strong> is useful for inspection, but anyone with the file can open its photos and receipts.</p><button class="button button-quiet" data-action="json" ${empty ? 'disabled' : ''}>Download unencrypted JSON</button>
    </div></details>
    <section class="restore-license" aria-labelledby="restore-title"><h3 id="restore-title">Already bought Claim Pack?</h3><p>Paste your license to restore the PDF builder on this device.</p><form id="license-form"><label for="license-token">License token</label><div class="inline-form"><input id="license-token" name="license" autocomplete="off" spellcheck="false" required><button class="button button-secondary">Verify license</button></div></form>${license.notice ? `<p class="license-notice">${escapeHtml(license.notice)}</p>` : ''}</section>
    <p class="legal-line">By buying, you agree to the <a href="/terms" data-route="terms">terms</a>. See how checkout and local records are handled in our <a href="/privacy" data-route="privacy">privacy notice</a>.</p>
  </section>`;
}

function guideMarkup(): string {
  return `<section class="page guide" aria-labelledby="guide-title"><p class="eyebrow">The 10-minute room sweep</p><h2 id="guide-title" tabindex="-1">Capture proof while the room is ordinary.</h2><p class="lead">Start broad, then add detail where it matters. A useful record today beats a perfect record someday.</p>
    <ol class="method"><li><span>01</span><div><h3>Walk one room</h3><p>Photograph higher-value belongings in place. This gives context and helps establish where an item lived.</p></div></li><li><span>02</span><div><h3>Catch the identifiers</h3><p>Add a serial or model number from the back, base, settings screen, or original box.</p></div></li><li><span>03</span><div><h3>Attach what you have</h3><p>A receipt is useful, but a photo, card statement, warranty email, or dated service record may also help. Requirements vary.</p></div></li><li><span>04</span><div><h3>Name the real location</h3><p>Record both room and container—such as “Garage / blue parts bin”—so related items can live apart without being lost.</p></div></li><li><span>05</span><div><h3>Export away from home</h3><p>Keep an encrypted backup somewhere physically separate and remember its passphrase. Test the import on another device.</p></div></li></ol>
    <div class="callout"><strong>Homebook is a record, not insurance advice.</strong><p>Coverage, acceptable proof, depreciation, and valuation methods vary. Ask your insurer what they require before a loss.</p></div>
    <button class="button button-primary" data-action="add">${icon('plus')} Add an item</button>
  </section>`;
}

function legalMarkup(kind: 'privacy' | 'terms'): string {
  if (kind === 'privacy') return `<article class="page legal" aria-labelledby="privacy-title"><p class="eyebrow">Plain-language policy</p><h2 id="privacy-title" tabindex="-1">Privacy</h2><p class="updated">Effective 28 August 2026</p><h3>Your inventory stays here</h3><p>Item records, photos, receipts, and passphrases are processed in your browser and stored in this device’s IndexedDB. We do not receive or operate a cloud copy. Clearing site data can erase them, so keep an export.</p><h3>Exports</h3><p>CSV and JSON files are readable by anyone who obtains them. Encrypted Homebook files use AES-GCM with a key derived from your passphrase; we cannot recover that passphrase or decrypt the file.</p><h3>Paid unlock</h3><p>If you buy Claim Pack, the checkout is hosted by Sociobot and Dodo, the merchant of record. They process purchase and refund information under their own policies. Homebook stores your license token and a daily verification result in local storage and sends the token to the Sociobot verification API. Inventory data is never included.</p><h3>Network and analytics</h3><p>The installed app does not include advertising, behavioral analytics, third-party fonts, or tracking scripts. It contacts Sociobot only when buying or verifying a license.</p><h3>Your controls</h3><p>Export your records at any time. Remove individual items in the inventory, or clear this site’s storage in your browser to remove everything.</p></article>`;
  return `<article class="page legal" aria-labelledby="terms-title"><p class="eyebrow">The agreement</p><h2 id="terms-title" tabindex="-1">Terms</h2><p class="updated">Effective 28 August 2026</p><h3>A personal record-keeping tool</h3><p>Claim-Ready Homebook helps you organize information you provide. It does not submit claims, provide insurance or legal advice, verify ownership, guarantee valuation, or guarantee that an insurer will accept any evidence.</p><h3>Your responsibility</h3><p>You are responsible for record accuracy, lawful use, backups, and remembering encryption passphrases. Do not rely on this device as your only copy.</p><h3>Claim Pack purchase</h3><p>Claim Pack costs $19 as a one-time purchase and unlocks the photo-rich PDF builder for permanent use while the license remains valid. Core inventory, CSV, JSON, and encrypted exports remain free. Sociobot/Dodo is the merchant of record and handles checkout and refunds; a refunded or revoked license stops unlocking paid features.</p><h3>Availability</h3><p>The app is provided “as is” without warranties. Browser storage can be cleared by browser settings, device management, or private browsing. We may update the app for security and compatibility.</p><h3>Acceptable use</h3><p>Do not use the service to violate law, infringe rights, distribute malware, or attempt to compromise the billing verification service.</p><h3>Liability</h3><p>To the maximum extent permitted by law, the authors are not liable for indirect or consequential loss, lost records, rejected claims, or forgotten passphrases.</p></article>`;
}

function dialogMarkup(): string {
  const item = editingId ? items.find(entry => entry.id === editingId) : undefined;
  const categories = ['Electronics', 'Furniture', 'Appliances', 'Jewellery', 'Tools', 'Collectibles', 'Clothing', 'Other'];
  return `<dialog id="item-dialog" aria-labelledby="dialog-title"><form id="item-form">
    <div class="dialog-head"><div><p class="eyebrow">Evidence record</p><h2 id="dialog-title">${item ? 'Edit item' : 'Add an item'}</h2></div><button class="icon-button" type="button" data-action="close-modal" aria-label="Close dialog">×</button></div>
    <p class="form-intro">Only the item name is required. Add what you know now and fill the gaps later.</p>
    <input type="hidden" name="id" value="${item?.id ?? ''}">
    <div class="form-grid"><label class="span-2">Item name <span aria-hidden="true">*</span><input name="name" required maxlength="120" value="${escapeHtml(item?.name ?? '')}" autocomplete="off"></label>
      <label>Category<select name="category"><option value="">Choose a category</option>${categories.map(value => `<option ${item?.category === value ? 'selected' : ''}>${value}</option>`).join('')}</select></label>
      <label>Estimated value <span class="hint">${escapeHtml(currency)}</span><input name="value" type="number" min="0" max="100000000" step="0.01" inputmode="decimal" value="${item?.value ?? ''}"></label>
      <label>Purchase date<input name="purchaseDate" type="date" value="${escapeHtml(item?.purchaseDate ?? '')}"></label>
      <label>Serial or model<input name="serial" maxlength="120" value="${escapeHtml(item?.serial ?? '')}" autocomplete="off"></label>
      <label>Room<input name="room" list="room-list" maxlength="80" value="${escapeHtml(item?.room ?? '')}" placeholder="Kitchen"><datalist id="room-list">${[...new Set(items.map(value => value.room).filter(Boolean))].map(value => `<option value="${escapeHtml(value)}">`).join('')}</datalist></label>
      <label>Container or exact spot<input name="container" maxlength="100" value="${escapeHtml(item?.container ?? '')}" placeholder="Top drawer / blue bin"></label>
      <label class="span-2">Notes<textarea name="notes" maxlength="1200" rows="3" placeholder="Condition, distinctive marks, related parts…">${escapeHtml(item?.notes ?? '')}</textarea></label>
      <div class="file-field"><label>Item photo <span class="hint">JPG, PNG, WebP • 12 MB max</span><input name="photo" type="file" accept="image/jpeg,image/png,image/webp" capture="environment"></label>${item?.photoName ? `<small>Current: ${escapeHtml(item.photoName)}</small><label class="check compact"><input type="checkbox" name="removePhoto"> <span>Remove current photo</span></label>` : ''}</div>
      <div class="file-field"><label>Receipt or proof <span class="hint">Image or PDF • 12 MB max</span><input name="receipt" type="file" accept="image/jpeg,image/png,image/webp,application/pdf"></label>${item?.receiptName ? `<small>Current: ${escapeHtml(item.receiptName)}</small><label class="check compact"><input type="checkbox" name="removeReceipt"> <span>Remove current file</span></label>` : ''}</div>
    </div>
    <p id="form-error" class="form-error" role="alert"></p>
    <div class="dialog-actions"><button class="button button-quiet" type="button" data-action="close-modal">Cancel</button><button class="button button-primary" type="submit" value="save">${item ? 'Save changes' : 'Add item'}</button></div>
  </form></dialog>`;
}

function render(): void {
  objectUrls.forEach(URL.revokeObjectURL);
  objectUrls = [];
  const main = route === 'inventory' ? inventoryMarkup() : route === 'export' ? exportMarkup() : route === 'guide' ? guideMarkup() : legalMarkup(route);
  app.innerHTML = `<header class="site-header"><div class="header-inner">
    <a class="brand" href="/" data-route="inventory"><img src="/icon-192.png" width="44" height="44" alt=""><h1>Claim-Ready <span>Homebook</span></h1></a>
    <p class="device-state"><span class="state-dot"></span>${navigator.onLine ? 'On this device' : 'Offline • records still available'}</p>
    <nav aria-label="Primary"><a href="/" data-route="inventory" ${route === 'inventory' ? 'aria-current="page"' : ''}>Inventory</a><a href="/export" data-route="export" ${route === 'export' ? 'aria-current="page"' : ''}>Export</a><a href="/guide" data-route="guide" ${route === 'guide' ? 'aria-current="page"' : ''}>Guide</a></nav>
    <button class="button button-primary header-add" data-action="add">${icon('plus')} Add item</button>
  </div></header>
  ${storageError ? `<div class="storage-error" role="alert"><strong>Local storage is unavailable.</strong> ${escapeHtml(storageError)}</div>` : ''}
  <main id="main">${main}</main>
  <footer><div><strong>Claim-Ready Homebook</strong><p>Private household records, prepared before they are needed.</p></div><nav aria-label="Legal"><a href="/privacy" data-route="privacy">Privacy</a><a href="/terms" data-route="terms">Terms</a><a href="/guide" data-route="guide">Preparedness guide</a></nav><p class="generated-note">Hero imagery was generated for this product. No tracking scripts.</p></footer>
  ${dialogMarkup()}
  <div class="toast ${noticeKind === 'error' ? 'toast-error' : ''}" role="status" aria-live="polite" ${notice ? '' : 'hidden'}><span>${escapeHtml(notice)}</span>${deletedItem ? '<button class="toast-action" data-action="undo">Undo</button>' : ''}<button class="toast-close" data-action="dismiss" aria-label="Dismiss message">×</button></div>`;
}

async function prepareImage(file: File): Promise<Blob> {
  if (file.size > 12 * 1024 * 1024) throw new Error(`${file.name} is larger than 12 MB.`);
  if (!file.type.startsWith('image/')) return file;
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
  if (scale === 1 && file.size < 1_500_000) { bitmap.close(); return file; }
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(bitmap.width * scale)); canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  canvas.getContext('2d')?.drawImage(bitmap, 0, 0, canvas.width, canvas.height); bitmap.close();
  return await new Promise((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('The image could not be prepared.')), 'image/jpeg', 0.82));
}

function showDialog(id: string | null): void {
  editingId = id;
  render();
  const dialog = document.querySelector<HTMLDialogElement>('#item-dialog')!;
  dialog.showModal();
  dialog.querySelector<HTMLInputElement>('input[name="name"]')?.focus();
}

async function saveItem(form: HTMLFormElement): Promise<void> {
  const submit = form.querySelector<HTMLButtonElement>('button[value="save"]');
  form.setAttribute('aria-busy', 'true');
  if (submit) { submit.disabled = true; submit.textContent = 'Saving…'; }
  const data = new FormData(form);
  const existing = items.find(item => item.id === data.get('id'));
  const photoFile = data.get('photo') as File;
  const receiptFile = data.get('receipt') as File;
  let photo = data.has('removePhoto') ? undefined : existing?.photo;
  let receipt = data.has('removeReceipt') ? undefined : existing?.receipt;
  let photoName = data.has('removePhoto') ? undefined : existing?.photoName;
  let receiptName = data.has('removeReceipt') ? undefined : existing?.receiptName;
  if (photoFile?.size) { photo = await prepareImage(photoFile); photoName = photoFile.name; }
  if (receiptFile?.size) { receipt = await prepareImage(receiptFile); receiptName = receiptFile.name; }
  const now = new Date().toISOString();
  const valueRaw = String(data.get('value') ?? '').trim();
  const item: HomeItem = {
    id: existing?.id ?? crypto.randomUUID(), name: String(data.get('name') ?? '').trim(), category: String(data.get('category') ?? ''),
    room: String(data.get('room') ?? '').trim(), container: String(data.get('container') ?? '').trim(), value: valueRaw === '' ? null : Number(valueRaw),
    purchaseDate: String(data.get('purchaseDate') ?? ''), serial: String(data.get('serial') ?? '').trim(), notes: String(data.get('notes') ?? '').trim(),
    photo, photoName, receipt, receiptName, createdAt: existing?.createdAt ?? now, updatedAt: now
  };
  if (!item.name) throw new Error('Give this item a name.');
  try {
    await db.put(item);
    items = await db.list();
    editingId = null;
    document.querySelector<HTMLDialogElement>('#item-dialog')?.close();
    notice = existing ? 'Item updated on this device.' : 'Item added to your homebook.';
    render();
    document.querySelector<HTMLElement>('#inventory-title')?.focus();
  } catch (error) {
    form.removeAttribute('aria-busy');
    if (submit) { submit.disabled = false; submit.textContent = existing ? 'Save changes' : 'Add item'; }
    throw error;
  }
}

async function importBackup(form: HTMLFormElement): Promise<void> {
  const data = new FormData(form);
  const file = data.get('backup') as File;
  if (!file?.size) throw new Error('Choose a backup file first.');
  if (file.size > 150 * 1024 * 1024) throw new Error('This backup is larger than 150 MB and cannot be imported safely.');
  let parsed: BackupPayload | EncryptedBackup;
  try { parsed = JSON.parse(await file.text()) as BackupPayload | EncryptedBackup; }
  catch { throw new Error('This file is not valid JSON or a Homebook backup.'); }
  let payload: BackupPayload;
  if (parsed.format === 'claim-ready-homebook-encrypted') {
    const passphrase = String(data.get('passphrase') ?? '');
    if (!passphrase) throw new Error('Enter the passphrase used to encrypt this backup.');
    payload = await decryptPayload(parsed as EncryptedBackup, passphrase);
  } else payload = parsed as BackupPayload;
  const restored = restorePayload(payload);
  const replace = data.has('replace');
  if (replace && items.length && !confirm(`Replace all ${items.length} existing records with ${restored.length} imported records?`)) return;
  const merged = replace ? restored : [...new Map([...items, ...restored].map(item => [item.id, item])).values()];
  await db.replaceAll(merged);
  items = await db.list();
  setNotice(`Imported ${restored.length} ${restored.length === 1 ? 'record' : 'records'} on this device.`);
}

app.addEventListener('click', async event => {
  const target = (event.target as HTMLElement).closest<HTMLElement>('[data-route], [data-action]');
  if (!target) return;
  const routeName = target.dataset.route as Route | undefined;
  if (routeName) { event.preventDefault(); setRoute(routeName); return; }
  const action = target.dataset.action;
  if (action === 'add') { if (route !== 'inventory') setRoute('inventory'); showDialog(null); }
  if (action === 'close-modal') { editingId = null; document.querySelector<HTMLDialogElement>('#item-dialog')?.close(); }
  if (action === 'edit') showDialog(target.dataset.id ?? null);
  if (action === 'clear-filters') { query = ''; roomFilter = ''; render(); }
  if (action === 'dismiss') { notice = ''; deletedItem = null; render(); }
  if (action === 'delete') {
    const item = items.find(value => value.id === target.dataset.id);
    if (item && confirm(`Remove “${item.name}” from this device? You can undo immediately after.`)) {
      await db.delete(item.id); deletedItem = item; items = await db.list(); notice = `${item.name} removed.`;
      clearTimeout(undoTimer); undoTimer = window.setTimeout(() => { deletedItem = null; render(); }, 8000); render();
    }
  }
  if (action === 'undo' && deletedItem) {
    clearTimeout(undoTimer); await db.put(deletedItem); items = await db.list(); notice = `${deletedItem.name} restored.`; deletedItem = null; render();
  }
  if (action === 'csv') { exportCsv(items, currency); setNotice('CSV claim list downloaded.'); }
  if (action === 'json') { await exportJson(items); setNotice('Unencrypted JSON backup downloaded.'); }
  if (action === 'pdf') {
    if (!license.valid) { setNotice('Verify a Claim Pack license to build the PDF.', 'error'); return; }
    try { await exportPdf(items, currency, message => { notice = message; noticeKind = 'info'; render(); }); }
    catch (error) { setNotice(error instanceof Error ? error.message : 'The PDF could not be created.', 'error'); }
  }
});

app.addEventListener('submit', async event => {
  event.preventDefault();
  const form = event.target as HTMLFormElement;
  const formId = form.getAttribute('id');
  try {
    if (formId === 'filter-form') { const data = new FormData(form); query = String(data.get('query') ?? ''); roomFilter = String(data.get('room') ?? ''); render(); }
    if (formId === 'item-form') await saveItem(form);
    if (formId === 'encrypted-export-form') {
      const passphrase = String(new FormData(form).get('passphrase') ?? '');
      notice = 'Encrypting records and attachments…'; render();
      const backup = await encryptPayload(await createPayload(items), passphrase);
      download(new Blob([JSON.stringify(backup)], { type: 'application/json' }), `homebook-encrypted-${todayStamp()}.homebook`);
      setNotice('Encrypted backup downloaded. Store it separately from the passphrase.');
    }
    if (formId === 'import-form') { notice = 'Opening backup…'; render(); await importBackup(form); }
    if (formId === 'license-form') {
      license = storeLicense(String(new FormData(form).get('license') ?? '')); render();
      license = await verifyLicense(license, true); render();
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Something went wrong. Try again.';
    const inlineError = form.querySelector<HTMLElement>('#form-error');
    if (inlineError) inlineError.textContent = message; else setNotice(message, 'error');
  }
});

app.addEventListener('change', event => {
  const select = event.target as HTMLSelectElement;
  if (select.name === 'currency') { currency = select.value; localStorage.setItem('homebook:currency', currency); render(); }
});

window.addEventListener('popstate', () => { route = routeFromPath(); render(); });
window.addEventListener('online', render);
window.addEventListener('offline', () => { notice = 'You are offline. Records and exports still work.'; render(); });

async function start(): Promise<void> {
  try { items = await db.list(); } catch (error) { storageError = error instanceof Error ? error.message : 'This browser blocked private storage.'; }
  render();
  if (license.token) { license = { ...license, checking: true }; license = await verifyLicense(license); render(); }
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      registration.addEventListener('updatefound', () => {
        const worker = registration.installing;
        worker?.addEventListener('statechange', () => { if (worker.state === 'installed' && navigator.serviceWorker.controller) setNotice('A fresh Homebook version is ready. Reload when convenient.'); });
      });
      navigator.serviceWorker.addEventListener('message', event => { if (event.data?.type === 'UPDATE_READY' && navigator.serviceWorker.controller) setNotice('Homebook is updated and ready offline.'); });
    } catch { /* The core app remains available when service workers are blocked. */ }
  }
}

start();
