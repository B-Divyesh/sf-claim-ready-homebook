import './styles.css';
import evidenceVault1280Avif from './assets/evidence-vault-1280.avif';
import evidenceVault1280Webp from './assets/evidence-vault-1280.webp';
import evidenceVault768Avif from './assets/evidence-vault-768.avif';
import evidenceVault768Webp from './assets/evidence-vault-768.webp';
import { HomebookDB } from './db';
import { createPayload, decryptPayload, encryptPayload, restorePayload } from './crypto';
import { exportCsv, exportJson, exportPdf } from './exports';
import type { BackupPayload, EncryptedBackup, HomeItem, Route } from './types';
import { CURRENCIES, download, escapeHtml, missingEvidence, money, readiness, todayStamp } from './utils';

const app = document.querySelector<HTMLDivElement>('#app')!;
const PRODUCT_ORIGIN = 'https://claim-ready-homebook.sociobot.in';
const APP_VERSION = '1.1.0';
const demoMode = location.pathname === '/demo' || new URLSearchParams(location.search).get('demo') === '1';
const db = new HomebookDB(demoMode ? 'claim-ready-homebook-demo' : 'claim-ready-homebook');
const currencyKey = demoMode ? 'demo:homebook:currency' : 'homebook:currency';

let items: HomeItem[] = [];
let route: Route = routeFromPath();
let query = '';
let roomFilter = '';
let editingId: string | null = null;
let dialogReturnFocus = 'inventory-add';
let deletedItem: HomeItem | null = null;
let undoTimer = 0;
let notice = '';
let noticeKind: 'info' | 'error' = 'info';
let currency = localStorage.getItem(currencyKey) || 'USD';
let storageError = '';
let objectUrls: string[] = [];

const titles: Record<Route, string> = {
  inventory: demoMode ? 'Demo — Claim-Ready Homebook' : 'Claim-Ready Homebook — Build a home inventory',
  export: 'Export home records — Claim-Ready Homebook',
  guide: 'Home inventory guide — Claim-Ready Homebook',
  privacy: 'Privacy — Claim-Ready Homebook',
  terms: 'Terms — Claim-Ready Homebook',
  notFound: 'Page not found — Claim-Ready Homebook'
};

const descriptions: Record<Route, string> = {
  inventory: 'Record belongings, photos, receipts, serial numbers, values, and locations before an insurance loss.',
  export: 'Export home inventory records as CSV, JSON, an encrypted backup, or a PDF claim packet.',
  guide: 'Record useful proof for a home inventory, one room at a time.',
  privacy: 'How Claim-Ready Homebook stores and processes records in your browser.',
  terms: 'Terms for using Claim-Ready Homebook as a personal record-keeping tool.',
  notFound: 'The requested Claim-Ready Homebook page was not found.'
};

function routeFromPath(): Route {
  const segment = location.pathname.split('/').filter(Boolean)[0];
  if (!segment || segment === 'demo') return 'inventory';
  if (segment === 'export' || segment === 'guide' || segment === 'privacy' || segment === 'terms') return segment;
  return 'notFound';
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

function basePath(value: Route): string {
  if (value === 'inventory') return '/';
  if (value === 'notFound') return '/404';
  return `/${value}`;
}

function currentPath(value: Route): string {
  if (!demoMode) return basePath(value);
  if (value === 'inventory') return '/demo';
  return `${basePath(value)}?demo=1`;
}

function updateMetadata(): void {
  document.title = titles[route];
  const description = document.querySelector<HTMLMetaElement>('meta[name="description"]');
  if (description) description.content = descriptions[route];
  const canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (canonical) canonical.href = `${PRODUCT_ORIGIN}${route === 'notFound' ? '/404' : basePath(route)}`;
  for (const selector of ['meta[property="og:title"]', 'meta[name="twitter:title"]']) {
    const element = document.querySelector<HTMLMetaElement>(selector);
    if (element) element.content = titles[route];
  }
  for (const selector of ['meta[property="og:description"]', 'meta[name="twitter:description"]']) {
    const element = document.querySelector<HTMLMetaElement>(selector);
    if (element) element.content = descriptions[route];
  }
}

function syncNotice(): void {
  const toast = document.querySelector<HTMLElement>('#app-notice');
  if (!toast) return;
  toast.hidden = !notice;
  toast.classList.toggle('toast-error', noticeKind === 'error');
  const message = toast.querySelector<HTMLElement>('[data-notice-text]');
  if (message) message.textContent = notice;
  const undo = toast.querySelector<HTMLButtonElement>('[data-action="undo"]');
  if (undo) undo.hidden = !deletedItem;
}

function setNotice(message: string, kind: 'info' | 'error' = 'info'): void {
  notice = message;
  noticeKind = kind;
  syncNotice();
}

function announceAndFocus(): void {
  const heading = document.querySelector<HTMLElement>('#main h1');
  heading?.focus();
  const announcer = document.querySelector<HTMLElement>('#route-announcer');
  if (announcer) {
    announcer.textContent = '';
    window.setTimeout(() => { announcer.textContent = document.title; }, 20);
  }
}

function setRoute(next: Route): void {
  route = next;
  history.pushState({}, '', currentPath(next));
  render();
  announceAndFocus();
  window.scrollTo({ top: 0, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
}

function filteredItems(): HomeItem[] {
  const needle = query.trim().toLowerCase();
  return items.filter(item => {
    const matchesQuery = !needle || [item.name, item.category, item.room, item.container, item.serial, item.notes]
      .some(value => value.toLowerCase().includes(needle));
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
    <div class="summary-kicker">Record completeness</div>
    <div class="score"><strong>${score}</strong><span>%</span></div>
    <progress class="meter" aria-label="Evidence completeness" max="100" value="${score}">${score}%</progress>
    <p>${score === 100 ? 'Every item has the five key evidence fields.' : items.length ? 'Add the missing evidence shown on each record.' : 'Add proof to increase this score.'}</p>
    <dl>
      <div><dt>Items</dt><dd>${items.length}</dd></div>
      <div><dt>Recorded value</dt><dd>${escapeHtml(money(total, currency))}</dd></div>
      <div><dt>With attachments</dt><dd>${items.filter(item => item.photo || item.receipt).length}</dd></div>
    </dl>
    <label class="currency-picker">Value currency<select name="currency" aria-label="Value currency">${CURRENCIES.map(value => `<option ${currency === value ? 'selected' : ''}>${value}</option>`).join('')}</select></label>
    <p class="local-note">${icon('shield')} <span>${demoMode ? 'Stored only in this demo' : 'Saved only in this browser'}</span></p>
  </aside>`;
}

function heroMarkup(): string {
  return `<section class="hero" aria-labelledby="page-title">
    <div class="hero-copy">
      <p class="eyebrow">Home inventory for insurance records</p>
      <h1 id="page-title" tabindex="-1">Build your home insurance record</h1>
      <p>For renters and homeowners, it keeps proof organized before a loss and makes files you can move.</p>
      <div class="hero-actions">
        <a class="button button-primary" href="/demo">Try it with sample data</a>
        <button class="button button-secondary" data-action="add" data-focus-id="hero-real-add">${icon('plus')} Add your first item</button>
      </div>
      <p class="action-note">The sample opens three example records in a separate demo.</p>
      <ul class="trust-list"><li>Works offline after the first visit</li><li>Records stay in this browser</li><li>CSV, JSON, encrypted backup, and PDF exports are free</li></ul>
    </div>
    <picture>
      <source type="image/avif" srcset="${evidenceVault768Avif} 768w, ${evidenceVault1280Avif} 1280w" sizes="(max-width: 760px) 100vw, 52vw">
      <img src="${evidenceVault768Webp}" srcset="${evidenceVault768Webp} 768w, ${evidenceVault1280Webp} 1280w" sizes="(max-width: 760px) 100vw, 52vw" width="768" height="512" alt="An archive case holds evidence cards, a camera, and a small house model" fetchpriority="high" decoding="async">
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
        <button class="button button-quiet" data-action="edit" data-id="${item.id}" data-focus-id="edit-${item.id}">${icon('edit')} Edit</button>
        <button class="button button-danger" data-action="delete" data-id="${item.id}">${icon('trash')} Remove</button>
      </div>
    </div>
  </li>`;
}

function inventoryWorkspaceMarkup(): string {
  const rooms = [...new Set(items.map(item => item.room).filter(Boolean))].sort();
  const visible = filteredItems();
  return `<div class="workspace">
    ${summaryMarkup()}
    <section class="inventory" aria-labelledby="inventory-title">
      <div class="section-heading"><h2 id="inventory-title">Your belongings</h2><button class="button button-primary" data-action="add" data-focus-id="inventory-add">${icon('plus')} Add an item</button></div>
      <form class="filters" id="filter-form" role="search">
        <label><span>Search records</span><span class="input-with-icon">${icon('search')}<input name="query" type="search" value="${escapeHtml(query)}" placeholder="Name, serial, location"></span></label>
        <label><span>Room</span><select name="room"><option value="">All rooms</option>${rooms.map(room => `<option ${room === roomFilter ? 'selected' : ''}>${escapeHtml(room)}</option>`).join('')}</select></label>
        <button class="button button-secondary" type="submit">Apply filters</button>
      </form>
      <p class="result-count" tabindex="-1" aria-live="polite">Showing ${visible.length} of ${items.length} ${items.length === 1 ? 'item' : 'items'}</p>
      ${visible.length ? `<ul class="item-list">${visible.map(itemCard).join('')}</ul>` : `<div class="no-results"><h3>No records match</h3><p>Try a different room or clear the search phrase.</p><button class="button button-secondary" data-action="clear-filters">Clear filters</button></div>`}
    </section>
  </div>`;
}

function landingMarkup(): string {
  return `${heroMarkup()}
    <section class="landing-section product-preview" aria-labelledby="preview-title">
      <p class="eyebrow">Start your record</p><h2 id="preview-title">Record your belongings</h2>
      <div class="empty-record"><div>${icon('box')}</div><div><h3>No items recorded</h3><p>Add item names first. You can add photos, receipts, serial numbers, values, and locations later.</p></div><button class="button button-primary" data-action="add" data-focus-id="preview-add">Add an item</button></div>
    </section>
    <section class="landing-section" aria-labelledby="how-title"><h2 id="how-title">How it works</h2>
      <ol class="steps"><li><span>1</span><div><h3>Add each item</h3><p>Record the name, value, serial number, room, and exact storage place.</p></div></li><li><span>2</span><div><h3>Attach proof</h3><p>Add a photo and receipt when you have them. Missing fields stay visible.</p></div></li><li><span>3</span><div><h3>Export copies</h3><p>Download a CSV, JSON file, encrypted backup, or PDF claim packet.</p></div></li></ol>
    </section>
    <section class="landing-section limits" aria-labelledby="limits-title"><h2 id="limits-title">Know the limits</h2><p>Homebook does not submit claims, confirm values, or guarantee that an insurer accepts your proof.</p><p>Browser storage is not a backup. Download an encrypted file and keep it somewhere else.</p><a class="text-link" href="/privacy" data-route="privacy">Read the privacy notice</a></section>`;
}

function inventoryMarkup(): string {
  if (!items.length && !demoMode) return landingMarkup();
  return `<section class="inventory-intro"><p class="eyebrow">${demoMode ? 'Sample home inventory' : 'Home inventory'}</p><h1 tabindex="-1">${demoMode ? 'Review a sample home inventory' : 'Update your home inventory'}</h1><p>${demoMode ? 'These three records are separate from your real inventory.' : 'Add missing proof, correct details, or export a current copy.'}</p></section>${inventoryWorkspaceMarkup()}`;
}

function exportMarkup(): string {
  const empty = !items.length;
  return `<section class="page narrow" aria-labelledby="export-title">
    <p class="eyebrow">Portable copies</p><h1 id="export-title" tabindex="-1">Export your home records</h1>
    <p class="lead">Export again whenever your records change. The original records remain in this browser.</p>
    ${empty ? `<div class="callout warning"><strong>Nothing to export yet.</strong><p>Add at least one belonging, then return here.</p><button class="button button-primary" data-action="add" data-focus-id="export-add">Add an item</button></div>` : ''}
    <div class="export-grid">
      <article class="export-option"><div class="option-icon">${icon('export')}</div><div><p class="tag">Free • readable</p><h2>Claim list CSV</h2><p>The file has one row per item and includes every saved text field.</p><button class="button button-secondary" data-action="csv" ${empty ? 'disabled' : ''}>Export CSV</button></div></article>
      <article class="export-option"><div class="option-icon">${icon('lock')}</div><div><p class="tag">Free • encrypted</p><h2>Encrypted portable backup</h2><p>This file carries all records, photos, and receipts. Only your passphrase can open it.</p>
        <form id="encrypted-export-form"><label for="backup-passphrase">Passphrase <span class="hint">10 or more characters</span></label><input id="backup-passphrase" name="passphrase" type="password" minlength="10" autocomplete="new-password" required><label class="check"><input type="checkbox" required> <span>I understand this passphrase cannot be recovered.</span></label><button class="button button-secondary" ${empty ? 'disabled' : ''}>Download encrypted backup</button></form>
      </div></article>
      <article class="export-option"><div class="option-icon">${icon('shield')}</div><div><p class="tag">Free • printable</p><h2>PDF claim packet</h2><p>The PDF has an item index, evidence details, room locations, and one page per item.</p><button class="button button-primary" data-action="pdf" ${empty ? 'disabled' : ''}>Build claim PDF</button></div></article>
    </div>
    <details class="transfer-panel"><summary>Move or restore a homebook</summary><div class="details-body">
      <p>Choose a Homebook <code>.homebook</code> or <code>.json</code> backup. Encrypted backups require the original passphrase.</p>
      <form id="import-form"><label for="import-file">Backup file</label><input id="import-file" name="backup" type="file" accept=".homebook,.json,application/json" required><label for="import-passphrase">Passphrase <span class="hint">Encrypted files only</span></label><input id="import-passphrase" name="passphrase" type="password" autocomplete="current-password"><label class="check"><input name="replace" type="checkbox"> <span>Replace records already in this ${demoMode ? 'demo' : 'browser'}</span></label><p id="import-error" class="form-error" role="alert" aria-live="assertive" tabindex="-1"></p><button class="button button-secondary">Import backup</button></form>
      <hr><p><strong>Unencrypted JSON</strong> can be inspected without a passphrase. Anyone with the file can open its attachments.</p><button class="button button-quiet" data-action="json" ${empty ? 'disabled' : ''}>Download unencrypted JSON</button>
    </div></details>
    <p class="legal-line">See the <a href="${currentPath('privacy')}" data-route="privacy">privacy notice</a> and <a href="${currentPath('terms')}" data-route="terms">terms</a>.</p>
  </section>`;
}

function guideMarkup(): string {
  return `<section class="page guide" aria-labelledby="guide-title"><p class="eyebrow">Room-by-room guide</p><h1 id="guide-title" tabindex="-1">Record useful proof in each room</h1><p class="lead">Start with names and photos. Add detail to costly or hard-to-replace items first.</p>
    <ol class="method"><li><span>01</span><div><h2>Walk one room</h2><p>Photograph higher-value belongings in place. The photo helps show where each item was kept.</p></div></li><li><span>02</span><div><h2>Record identifiers</h2><p>Add a serial or model number from the item, settings screen, or original box.</p></div></li><li><span>03</span><div><h2>Attach available proof</h2><p>Add a receipt, card statement, warranty email, or dated service record. Insurer requirements vary.</p></div></li><li><span>04</span><div><h2>Name the location</h2><p>Record both room and container, such as “Garage / blue parts bin.”</p></div></li><li><span>05</span><div><h2>Keep a separate copy</h2><p>Store an encrypted backup away from home. Remember the passphrase and test the import.</p></div></li></ol>
    <div class="callout"><strong>Homebook is a record, not insurance advice.</strong><p>Coverage, proof, depreciation, and valuation rules vary. Ask your insurer what they require.</p></div>
    <button class="button button-primary" data-action="add" data-focus-id="guide-add">${icon('plus')} Add an item</button>
  </section>`;
}

function legalMarkup(kind: 'privacy' | 'terms'): string {
  if (kind === 'privacy') return `<article class="page legal" aria-labelledby="privacy-title"><p class="eyebrow">Data handling</p><h1 id="privacy-title" tabindex="-1">Privacy</h1><p class="updated">Effective 5 September 2026</p><h2>Your inventory stays here</h2><p>Item records, photos, and receipts are processed and stored in this browser. We do not receive a cloud copy.</p><p>Clearing site data can erase your records. Keep an export on another device.</p><h2>Demo storage is separate</h2><p>The demo uses a separate browser database. Starting for real clears the demo and opens your normal inventory.</p><h2>Exports</h2><p>CSV and JSON files are readable by anyone who gets them. Encrypted Homebook files require your passphrase.</p><p>Encryption uses PBKDF2-SHA-256 with 250,000 iterations and AES-256-GCM. Each file gets a random salt and IV.</p><p>The passphrase is processed in memory. It is never stored and cannot be recovered.</p><h2>Network and analytics</h2><p>The app has no advertising, analytics, tracking scripts, CDN fonts, or cloud inventory service.</p><h2>Your controls</h2><p>Export your records at any time. Remove items here, or clear this site’s browser storage to remove everything.</p></article>`;
  return `<article class="page legal" aria-labelledby="terms-title"><p class="eyebrow">Use terms</p><h1 id="terms-title" tabindex="-1">Terms</h1><p class="updated">Effective 5 September 2026</p><h2>A personal record-keeping tool</h2><p>Claim-Ready Homebook organizes information you provide. It does not submit claims or provide insurance or legal advice.</p><p>It does not verify ownership, guarantee values, or guarantee that an insurer will accept evidence.</p><h2>Your responsibility</h2><p>You are responsible for accurate records, lawful use, backups, and encryption passphrases. Do not keep only one copy.</p><h2>Price</h2><p>The app and its current exports are available at no charge. No paid checkout is offered.</p><h2>Availability</h2><p>The app is provided “as is” without warranties. Browser settings, device management, or private browsing can clear stored records.</p><h2>Acceptable use</h2><p>Do not use the app to violate law, infringe rights, distribute malware, or attack this site.</p><h2>Liability</h2><p>To the extent allowed by law, the authors are not liable for lost records, rejected claims, or forgotten passphrases.</p></article>`;
}

function notFoundMarkup(): string {
  return `<section class="page not-found"><p class="eyebrow">404 error</p><h1 tabindex="-1">Page not found</h1><p class="lead">This address does not match a Homebook page.</p><a class="button button-primary" href="${currentPath('inventory')}" data-route="inventory">Return to your inventory</a></section>`;
}

function dialogMarkup(): string {
  const item = editingId ? items.find(entry => entry.id === editingId) : undefined;
  const categories = ['Electronics', 'Furniture', 'Appliances', 'Jewellery', 'Tools', 'Collectibles', 'Clothing', 'Other'];
  return `<dialog id="item-dialog" aria-labelledby="dialog-title"><form id="item-form">
    <div class="dialog-head"><div><p class="eyebrow">Item record</p><h2 id="dialog-title">${item ? 'Edit item' : 'Add an item'}</h2></div><button class="icon-button" type="button" data-action="close-modal" aria-label="Close dialog">×</button></div>
    <p id="item-name-help" class="form-intro">Only the item name is required. Add other details now or later.</p>
    <input type="hidden" name="id" value="${item?.id ?? ''}">
    <div class="form-grid"><label class="span-2">Item name <span aria-hidden="true">*</span><input name="name" required maxlength="120" value="${escapeHtml(item?.name ?? '')}" autocomplete="off" aria-describedby="item-name-help form-error"></label>
      <label>Category<select name="category"><option value="">Choose a category</option>${categories.map(value => `<option ${item?.category === value ? 'selected' : ''}>${value}</option>`).join('')}</select></label>
      <label>Estimated value <span class="hint">${escapeHtml(currency)}</span><input name="value" type="number" min="0" max="100000000" step="0.01" inputmode="decimal" value="${item?.value ?? ''}"></label>
      <label>Purchase date<input name="purchaseDate" type="date" value="${escapeHtml(item?.purchaseDate ?? '')}"></label>
      <label>Serial or model<input name="serial" maxlength="120" value="${escapeHtml(item?.serial ?? '')}" autocomplete="off"></label>
      <label>Room<input name="room" list="room-list" maxlength="80" value="${escapeHtml(item?.room ?? '')}" placeholder="Kitchen"><datalist id="room-list">${[...new Set(items.map(value => value.room).filter(Boolean))].map(value => `<option value="${escapeHtml(value)}">`).join('')}</datalist></label>
      <label>Container or exact spot<input name="container" maxlength="100" value="${escapeHtml(item?.container ?? '')}" placeholder="Top drawer / blue bin"></label>
      <label class="span-2">Notes<textarea name="notes" maxlength="1200" rows="3" placeholder="Condition, distinctive marks, related parts">${escapeHtml(item?.notes ?? '')}</textarea></label>
      <div class="file-field"><label>Item photo <span class="hint">JPG, PNG, WebP • 12 MB max</span><input name="photo" type="file" accept="image/jpeg,image/png,image/webp" capture="environment"></label>${item?.photoName ? `<small>Current: ${escapeHtml(item.photoName)}</small><label class="check compact"><input type="checkbox" name="removePhoto"> <span>Remove current photo</span></label>` : ''}</div>
      <div class="file-field"><label>Receipt or proof <span class="hint">Image or PDF • 12 MB max</span><input name="receipt" type="file" accept="image/jpeg,image/png,image/webp,application/pdf"></label>${item?.receiptName ? `<small>Current: ${escapeHtml(item.receiptName)}</small><label class="check compact"><input type="checkbox" name="removeReceipt"> <span>Remove current file</span></label>` : ''}</div>
    </div>
    <p id="form-error" class="form-error" role="alert" aria-live="assertive"></p>
    <div class="dialog-actions"><button class="button button-quiet" type="button" data-action="close-modal">Cancel</button><button class="button button-primary" type="submit" value="save">${item ? 'Save changes' : 'Add item'}</button></div>
  </form></dialog>`;
}

function headerMarkup(): string {
  const nav = demoMode
    ? `<a href="/demo" data-route="inventory" ${route === 'inventory' ? 'aria-current="page"' : ''}>Demo</a><a href="${currentPath('export')}" data-route="export" ${route === 'export' ? 'aria-current="page"' : ''}>Export</a><a href="${currentPath('guide')}" data-route="guide" ${route === 'guide' ? 'aria-current="page"' : ''}>Guide</a><a href="${currentPath('privacy')}" data-route="privacy" ${route === 'privacy' ? 'aria-current="page"' : ''}>Privacy</a>`
    : `<a href="/demo">Demo</a><a href="/" data-route="inventory" ${route === 'inventory' ? 'aria-current="page"' : ''}>Inventory</a><a href="/export" data-route="export" ${route === 'export' ? 'aria-current="page"' : ''}>Export</a><a href="/privacy" data-route="privacy" ${route === 'privacy' ? 'aria-current="page"' : ''}>Privacy</a>`;
  return `<header class="site-header"><div class="header-inner">
    <a class="brand" href="${currentPath('inventory')}" data-route="inventory"><img src="/icon-192.png" width="44" height="44" alt=""><span>Claim-Ready <strong>Homebook</strong></span></a>
    <p class="device-state"><span class="state-dot"></span><span data-connection-state>${navigator.onLine ? 'On this device' : 'Offline • records still available'}</span></p>
    <nav aria-label="Primary">${nav}</nav>
    <button class="button button-primary header-add" data-action="add" data-focus-id="header-add">${icon('plus')} Add item</button>
  </div></header>`;
}

function demoBannerMarkup(): string {
  if (!demoMode) return '';
  return `<aside class="demo-banner" aria-label="Demo mode"><strong>Demo — sample data, nothing is saved</strong><div><button class="button button-secondary" data-action="reset-demo">Reset demo</button><button class="button button-primary" data-action="start-real">Start for real</button></div></aside>`;
}

function footerMarkup(): string {
  return `<footer><div><strong>Claim-Ready Homebook</strong><p>Keep a portable record of belongings and proof.</p><p>Built by Param Factory • Build ${APP_VERSION}</p></div><nav aria-label="Footer"><a href="${currentPath('privacy')}" data-route="privacy">Privacy</a><a href="${currentPath('terms')}" data-route="terms">Terms</a><a href="${currentPath('guide')}" data-route="guide">Guide</a></nav><p class="generated-note">The hero image was generated for this product. The app contains no tracking scripts.</p></footer>`;
}

function render(): void {
  objectUrls.forEach(URL.revokeObjectURL);
  objectUrls = [];
  updateMetadata();
  const main = route === 'inventory' ? inventoryMarkup()
    : route === 'export' ? exportMarkup()
      : route === 'guide' ? guideMarkup()
        : route === 'privacy' || route === 'terms' ? legalMarkup(route)
          : notFoundMarkup();
  app.innerHTML = `${headerMarkup()}${demoBannerMarkup()}
    ${storageError ? `<div class="storage-error" role="alert"><strong>Browser storage is unavailable.</strong> ${escapeHtml(storageError)}</div>` : ''}
    <div id="route-announcer" class="sr-only" aria-live="polite" aria-atomic="true"></div>
    <main id="main">${main}</main>
    ${footerMarkup()}${dialogMarkup()}
    <div id="app-notice" class="toast" role="status" aria-live="polite" hidden><span data-notice-text></span><button class="toast-action" data-action="undo" hidden>Undo</button><button class="toast-close" data-action="dismiss" aria-label="Dismiss message">×</button></div>`;
  document.querySelector<HTMLDialogElement>('#item-dialog')?.addEventListener('close', () => {
    editingId = null;
    window.requestAnimationFrame(() => {
      const target = document.querySelector<HTMLElement>(`[data-focus-id="${dialogReturnFocus}"]`);
      (target ?? document.querySelector<HTMLElement>('#main h1'))?.focus();
    });
  });
  syncNotice();
}

async function demoSamples(): Promise<HomeItem[]> {
  const updatedAt = '2026-08-30T10:30:00.000Z';
  let photo: Blob | undefined;
  try {
    const response = await fetch(evidenceVault768Webp);
    if (response.ok) photo = await response.blob();
  } catch { /* Sample records still work without the optional image. */ }
  const receipt = new Blob(['Sample receipt for demo use only'], { type: 'application/pdf' });
  return [
    { id: 'demo-camera', name: 'Mirrorless camera', category: 'Electronics', room: 'Office', container: 'Locked cabinet', value: 1249, purchaseDate: '2024-06-14', serial: 'MC-4829-AX', notes: 'Black body with a small scratch beside the battery door.', photo, photoName: photo ? 'camera-proof.webp' : undefined, receipt, receiptName: 'camera-receipt.pdf', createdAt: updatedAt, updatedAt },
    { id: 'demo-table', name: 'Oak dining table', category: 'Furniture', room: 'Dining room', container: 'North wall', value: 780, purchaseDate: '2021-11-06', serial: 'DT-OAK-180', notes: 'Six-seat table with matching extension leaf.', receipt: new Blob(['Sample furniture receipt'], { type: 'application/pdf' }), receiptName: 'dining-table-receipt.pdf', createdAt: updatedAt, updatedAt },
    { id: 'demo-drill', name: 'Cordless drill kit', category: 'Tools', room: 'Garage', container: 'Blue parts bin', value: 219, purchaseDate: '2023-03-22', serial: 'DRL-20V-7712', notes: 'Drill, charger, two batteries, and bit case.', createdAt: updatedAt, updatedAt }
  ];
}

async function resetDemo(): Promise<void> {
  items = await demoSamples();
  await db.replaceAll(items);
  query = '';
  roomFilter = '';
  render();
  setNotice('Demo reset to three sample records.');
}

async function prepareImage(file: File): Promise<Blob> {
  if (file.size > 12 * 1024 * 1024) throw new Error(`${file.name} is larger than 12 MB.`);
  if (!file.type.startsWith('image/')) return file;
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
  if (scale === 1 && file.size < 1_500_000) { bitmap.close(); return file; }
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  canvas.getContext('2d')?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return await new Promise((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('The image could not be prepared.')), 'image/jpeg', 0.82));
}

function showDialog(id: string | null, returnFocus?: string): void {
  editingId = id;
  if (returnFocus) dialogReturnFocus = returnFocus;
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
  const numericValue = valueRaw === '' ? null : Number(valueRaw);
  if (numericValue !== null && (!Number.isFinite(numericValue) || numericValue < 0 || numericValue > 100_000_000)) throw new Error('Enter a value from 0 to 100,000,000.');
  const item: HomeItem = {
    id: existing?.id ?? crypto.randomUUID(), name: String(data.get('name') ?? '').trim(), category: String(data.get('category') ?? ''),
    room: String(data.get('room') ?? '').trim(), container: String(data.get('container') ?? '').trim(), value: numericValue,
    purchaseDate: String(data.get('purchaseDate') ?? ''), serial: String(data.get('serial') ?? '').trim(), notes: String(data.get('notes') ?? '').trim(),
    photo, photoName, receipt, receiptName, createdAt: existing?.createdAt ?? now, updatedAt: now
  };
  if (!item.name) throw new Error('Give this item a name.');
  try {
    await db.put(item);
    items = await db.list();
    document.querySelector<HTMLDialogElement>('#item-dialog')?.close();
    editingId = null;
    render();
    setNotice(existing ? 'Item updated in this browser.' : 'Item added to your homebook.');
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
  render();
  setNotice(`Imported ${restored.length} ${restored.length === 1 ? 'record' : 'records'} in this ${demoMode ? 'demo' : 'browser'}.`);
}

app.addEventListener('click', async event => {
  const target = (event.target as HTMLElement).closest<HTMLElement>('[data-route], [data-action]');
  if (!target) return;
  const routeName = target.dataset.route as Route | undefined;
  if (routeName) { event.preventDefault(); setRoute(routeName); return; }
  const action = target.dataset.action;
  if (action === 'add') {
    const returnFocus = target.dataset.focusId;
    if (route !== 'inventory') setRoute('inventory');
    showDialog(null, returnFocus);
  }
  if (action === 'close-modal') document.querySelector<HTMLDialogElement>('#item-dialog')?.close();
  if (action === 'edit') showDialog(target.dataset.id ?? null, target.dataset.focusId);
  if (action === 'clear-filters') { query = ''; roomFilter = ''; render(); document.querySelector<HTMLElement>('.result-count')?.focus(); }
  if (action === 'dismiss') { notice = ''; deletedItem = null; clearTimeout(undoTimer); syncNotice(); }
  if (action === 'reset-demo' && demoMode) await resetDemo();
  if (action === 'start-real' && demoMode) { await db.replaceAll([]); location.assign('/'); }
  if (action === 'delete') {
    const item = items.find(value => value.id === target.dataset.id);
    if (item && confirm(`Remove “${item.name}” from this ${demoMode ? 'demo' : 'browser'}? You can undo immediately after.`)) {
      await db.delete(item.id);
      deletedItem = item;
      items = await db.list();
      clearTimeout(undoTimer);
      undoTimer = window.setTimeout(() => { deletedItem = null; syncNotice(); }, 8000);
      render();
      setNotice(`${item.name} removed.`);
    }
  }
  if (action === 'undo' && deletedItem) {
    clearTimeout(undoTimer);
    const restored = deletedItem;
    await db.put(restored);
    items = await db.list();
    deletedItem = null;
    render();
    setNotice(`${restored.name} restored.`);
  }
  if (action === 'csv') { exportCsv(items, currency); setNotice('CSV claim list downloaded.'); }
  if (action === 'json') { await exportJson(items); setNotice('Unencrypted JSON backup downloaded.'); }
  if (action === 'pdf') {
    try { await exportPdf(items, currency, message => setNotice(message)); }
    catch (error) { setNotice(error instanceof Error ? error.message : 'The PDF could not be created.', 'error'); }
  }
});

app.addEventListener('submit', async event => {
  event.preventDefault();
  const form = event.target as HTMLFormElement;
  const formId = form.getAttribute('id');
  form.querySelector<HTMLElement>('.form-error')?.replaceChildren();
  try {
    if (formId === 'filter-form') {
      const data = new FormData(form);
      query = String(data.get('query') ?? '');
      roomFilter = String(data.get('room') ?? '');
      render();
      document.querySelector<HTMLElement>('.result-count')?.focus();
    }
    if (formId === 'item-form') await saveItem(form);
    if (formId === 'encrypted-export-form') {
      const passphrase = String(new FormData(form).get('passphrase') ?? '');
      setNotice('Encrypting records and attachments…');
      const backup = await encryptPayload(await createPayload(items), passphrase);
      download(new Blob([JSON.stringify(backup)], { type: 'application/json' }), `homebook-encrypted-${todayStamp()}.homebook`);
      setNotice('Encrypted backup downloaded. Store it separately from the passphrase.');
    }
    if (formId === 'import-form') { setNotice('Opening backup…'); await importBackup(form); }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Something went wrong. Try again.';
    const inlineError = form.querySelector<HTMLElement>('.form-error');
    if (inlineError) { inlineError.textContent = message; inlineError.focus(); } else setNotice(message, 'error');
  }
});

app.addEventListener('change', event => {
  const select = event.target as HTMLSelectElement;
  if (select.name === 'currency') { currency = select.value; localStorage.setItem(currencyKey, currency); render(); }
});

function updateConnectionState(): void {
  const state = document.querySelector<HTMLElement>('[data-connection-state]');
  if (state) state.textContent = navigator.onLine ? 'On this device' : 'Offline • records still available';
}

window.addEventListener('popstate', () => { route = routeFromPath(); render(); announceAndFocus(); });
window.addEventListener('online', () => { updateConnectionState(); setNotice('Connection restored.'); });
window.addEventListener('offline', () => { updateConnectionState(); setNotice('You are offline. Records and exports still work.'); });

async function start(): Promise<void> {
  try {
    items = await db.list();
    if (demoMode && !items.length) await resetDemo();
    else render();
  } catch (error) {
    storageError = error instanceof Error ? error.message : 'This browser blocked private storage.';
    render();
  }
  if ('serviceWorker' in navigator) {
    const hadController = Boolean(navigator.serviceWorker.controller);
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      registration.addEventListener('updatefound', () => {
        const worker = registration.installing;
        worker?.addEventListener('statechange', () => {
          if (hadController && worker.state === 'installed') setNotice('A new version is ready. Reload to use it.');
        });
      });
      navigator.serviceWorker.addEventListener('message', event => {
        if (hadController && event.data?.type === 'UPDATE_READY') setNotice('Homebook was updated and is ready offline.');
      });
    } catch { /* The core app remains available when service workers are blocked. */ }
  }
}

start();
