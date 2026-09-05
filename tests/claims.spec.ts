import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';

async function demoExportPage(page: import('@playwright/test').Page) {
  await page.goto('/demo');
  await expect(page.getByText('Demo — sample data, nothing is saved')).toBeVisible();
  await page.getByRole('link', { name: 'Export', exact: true }).click();
}

async function downloadEncrypted(page: import('@playwright/test').Page, passphrase: string) {
  await page.getByLabel('Passphrase', { exact: false }).first().fill(passphrase);
  await page.locator('#encrypted-export-form input[type="checkbox"]').check();
  const event = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download encrypted backup' }).click();
  const download = await event;
  const path = await download.path();
  if (!path) throw new Error('Encrypted backup did not produce a local download.');
  return { download, path, text: await readFile(path, 'utf8') };
}

test('@claim:demo-isolation sample changes never touch the normal inventory', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Add your first item' }).click();
  await page.getByLabel('Item name').fill('Real family television');
  await page.getByRole('dialog').getByRole('button', { name: 'Add item' }).click();
  await expect(page.getByRole('heading', { name: 'Real family television' })).toBeVisible();
  await page.goto('/demo');
  await expect(page.getByText('Demo — sample data, nothing is saved')).toBeVisible();
  await expect(page.getByText('Showing 3 of 3 items')).toBeVisible();
  await page.getByRole('button', { name: 'Add an item', exact: true }).click();
  await page.getByLabel('Item name').fill('Demo-only headphones');
  await page.getByRole('dialog').getByRole('button', { name: 'Add item' }).click();
  await expect(page.getByText('Showing 4 of 4 items')).toBeVisible();
  await page.getByRole('button', { name: 'Reset demo' }).click();
  await expect(page.getByText('Showing 3 of 3 items')).toBeVisible();
  await expect(page.getByText('Demo-only headphones')).toHaveCount(0);
  await page.getByRole('button', { name: 'Start for real' }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole('heading', { name: 'Real family television' })).toBeVisible();
  expect(await page.evaluate(async () => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('claim-ready-homebook-demo', 1);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    return await new Promise<number>((resolve, reject) => {
      const request = database.transaction('items').objectStore('items').count();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  })).toBe(0);
});

test('@claim:offline-reload the demo reloads and exports while offline after the first visit', async ({ browser }) => {
  const context = await browser.newContext({ baseURL: 'http://127.0.0.1:4173', acceptDownloads: true });
  const page = await context.newPage();
  await page.goto('/demo');
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller) await new Promise<void>(resolve => navigator.serviceWorker.addEventListener('controllerchange', () => resolve(), { once: true }));
  });
  await page.reload();
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByText('Demo — sample data, nothing is saved')).toBeVisible();
  await expect(page.getByText('Offline • records still available')).toBeVisible();
  await page.getByRole('link', { name: 'Export', exact: true }).click();
  const event = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export CSV' }).click();
  expect((await event).suggestedFilename()).toContain('homebook-claim-list');
  await context.close();
});

test('@claim:local-only the inventory flow sends no data outside the product origin', async ({ page }) => {
  const outgoing: string[] = [];
  page.on('request', request => outgoing.push(request.url()));
  await page.goto('/demo');
  await page.getByRole('button', { name: 'Edit', exact: true }).first().click();
  await page.getByLabel('Notes').fill('Updated only inside this browser');
  await page.getByRole('button', { name: 'Save changes' }).click();
  await expect(page.getByText('Item updated in this browser.')).toBeVisible();
  await page.reload();
  await page.getByRole('button', { name: 'Edit', exact: true }).first().click();
  await expect(page.getByLabel('Notes')).toHaveValue('Updated only inside this browser');
  expect([...new Set(outgoing.map(url => new URL(url).origin))]).toEqual(['http://127.0.0.1:4173']);
  await expect(page.locator('input[type="email"]')).toHaveCount(0);
});

test('@claim:inventory-records item details, attachments, completeness, search, and persistence work in the demo', async ({ page }) => {
  await page.goto('/demo');
  await page.getByRole('button', { name: 'Add an item', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Item name').fill('Kitchen mixer');
  await dialog.getByLabel('Category').selectOption('Appliances');
  await dialog.getByLabel(/Estimated value/).fill('429.99');
  await dialog.getByLabel('Purchase date').fill('2025-02-18');
  await dialog.getByLabel('Serial or model').fill('MIX-4431');
  await dialog.getByLabel('Room', { exact: true }).fill('Kitchen');
  await dialog.getByLabel('Container or exact spot').fill('Lower pantry shelf');
  await dialog.getByLabel('Notes').fill('Silver mixer with three attachments');
  await dialog.getByLabel('Item photo').setInputFiles({ name: 'mixer.png', mimeType: 'image/png', buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64') });
  await dialog.getByLabel('Receipt or proof').setInputFiles({ name: 'mixer-receipt.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4\n% sample') });
  await dialog.getByRole('button', { name: 'Add item' }).click();
  await expect(page.getByRole('heading', { name: 'Kitchen mixer' })).toBeVisible();
  await expect(page.getByRole('listitem').filter({ hasText: 'Kitchen mixer' }).getByText('Five key evidence fields recorded.')).toBeVisible();
  await page.reload();
  await expect(page.getByText('MIX-4431')).toBeVisible();
  await expect(page.getByText('Kitchen / Lower pantry shelf')).toBeVisible();
  await page.getByLabel('Search records').fill('MIX-4431');
  await page.getByRole('button', { name: 'Apply filters' }).click();
  await expect(page.getByText('Showing 1 of 4 items')).toBeVisible();
  await expect(page.getByRole('img', { name: 'Photo of Kitchen mixer' })).toBeVisible();
});

test('@claim:csv-export CSV has every saved text field and one row per sample record', async ({ page }) => {
  await demoExportPage(page);
  const event = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export CSV' }).click();
  const path = await (await event).path();
  if (!path) throw new Error('CSV did not produce a local download.');
  const csv = await readFile(path, 'utf8');
  const lines = csv.trim().split(/\r?\n/);
  expect(lines).toHaveLength(5);
  expect(lines[1]).toBe('Record ID,Item,Category,Room,Container,Estimated value,Currency,Purchase date,Serial/model,Photo filename,Receipt filename,Notes,Created,Last updated');
  expect(csv).toContain('Mirrorless camera');
  expect(csv).toContain('camera-receipt.pdf');
  expect(csv).toContain('DRL-20V-7712');
});

test('@claim:json-export JSON carries all sample records and binary attachments', async ({ page }) => {
  await demoExportPage(page);
  await page.getByText('Move or restore a homebook').click();
  const event = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download unencrypted JSON' }).click();
  const path = await (await event).path();
  if (!path) throw new Error('JSON did not produce a local download.');
  const payload = JSON.parse(await readFile(path, 'utf8'));
  expect(payload.format).toBe('claim-ready-homebook');
  expect(payload.items).toHaveLength(3);
  const camera = payload.items.find((item: { id: string }) => item.id === 'demo-camera');
  expect(camera.photo.name).toBe('camera-proof.webp');
  expect(camera.photo.data.length).toBeGreaterThan(1000);
  expect(camera.receipt.name).toBe('camera-receipt.pdf');
  expect(camera.receipt.data.length).toBeGreaterThan(10);
});

test('@claim:encrypted-backup encryption is random, uses the stated settings, retains attachments, rejects a wrong passphrase, and stores no passphrase', async ({ page, browser }) => {
  await demoExportPage(page);
  const first = await downloadEncrypted(page, 'portable-proof-2026');
  const second = await downloadEncrypted(page, 'portable-proof-2026');
  const one = JSON.parse(first.text);
  const two = JSON.parse(second.text);
  expect(one.kdf).toMatchObject({ name: 'PBKDF2', hash: 'SHA-256', iterations: 250000 });
  expect(one.cipher.name).toBe('AES-GCM');
  expect(Buffer.from(one.kdf.salt, 'base64')).toHaveLength(16);
  expect(Buffer.from(one.cipher.iv, 'base64')).toHaveLength(12);
  expect(one.kdf.salt).not.toBe(two.kdf.salt);
  expect(one.cipher.iv).not.toBe(two.cipher.iv);
  expect(await page.evaluate(() => JSON.stringify({ ...localStorage, ...sessionStorage }))).not.toContain('portable-proof-2026');

  await page.getByText('Move or restore a homebook').click();
  const fileInput = page.getByLabel('Backup file');
  await fileInput.setInputFiles(first.path);
  await page.getByLabel('Passphrase', { exact: false }).last().fill('wrong-passphrase');
  await page.getByRole('button', { name: 'Import backup' }).click();
  await expect(page.getByText('That passphrase did not open this backup, or the file is damaged.')).toBeVisible();
  await expect(page.locator('details.transfer-panel')).toHaveAttribute('open', '');
  expect(await fileInput.evaluate((input: HTMLInputElement) => input.files?.length)).toBe(1);

  const secondDevice = await browser.newContext({ baseURL: 'http://127.0.0.1:4173' });
  const secondPage = await secondDevice.newPage();
  await secondPage.goto('/demo');
  await secondPage.getByRole('link', { name: 'Export', exact: true }).click();
  await secondPage.getByText('Move or restore a homebook').click();
  await secondPage.getByLabel('Backup file').setInputFiles(first.path);
  await secondPage.getByLabel('Passphrase', { exact: false }).last().fill('portable-proof-2026');
  await secondPage.getByRole('button', { name: 'Import backup' }).click();
  await expect(secondPage.getByText('Imported 3 records in this demo.')).toBeVisible();
  await secondPage.getByRole('link', { name: 'Demo', exact: true }).click();
  await expect(secondPage.getByRole('img', { name: 'Photo of Mirrorless camera' })).toBeVisible();
  await secondDevice.close();
});

test('@claim:pdf-export PDF includes an index, an item page for each sample record, and a photo', async ({ page }) => {
  await demoExportPage(page);
  expect(await page.evaluate(() => Object.keys(localStorage).some(key => key.startsWith('sb_license:')))).toBe(false);
  await expect(page.locator('a[href*="/checkout"]')).toHaveCount(0);
  const event = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Build claim PDF' }).click();
  const download = await event;
  const path = await download.path();
  if (!path) throw new Error('PDF did not produce a local download.');
  const pdf = await readFile(path);
  const source = pdf.toString('latin1');
  const pageCounts = [...source.matchAll(/\/Count\s+(\d+)/g)].map(match => Number(match[1]));
  expect(download.suggestedFilename()).toContain('homebook-claim-packet');
  expect(source.startsWith('%PDF-')).toBe(true);
  expect(Math.max(...pageCounts)).toBeGreaterThanOrEqual(4);
  expect(source).toContain('/Subtype /Image');
  expect(pdf.byteLength).toBeGreaterThan(20_000);
});

test('@claim:fifty-item-portability a 50-item encrypted export opens in another browser profile in under ten minutes', async ({ page, browser }) => {
  test.setTimeout(180_000);
  const started = Date.now();
  await page.goto('/demo');
  for (let number = 4; number <= 50; number += 1) {
    await page.getByRole('button', { name: 'Add an item', exact: true }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('Item name').fill(`Household item ${number}`);
    await dialog.getByRole('button', { name: 'Add item' }).click();
  }
  await expect(page.getByText('Showing 50 of 50 items')).toBeVisible();
  await page.getByRole('link', { name: 'Export', exact: true }).click();
  const backup = await downloadEncrypted(page, 'fifty-record-proof');
  const other = await browser.newContext({ baseURL: 'http://127.0.0.1:4173' });
  const otherPage = await other.newPage();
  await otherPage.goto('/demo');
  await otherPage.getByRole('link', { name: 'Export', exact: true }).click();
  await otherPage.getByText('Move or restore a homebook').click();
  await otherPage.getByLabel('Backup file').setInputFiles(backup.path);
  await otherPage.getByLabel('Passphrase', { exact: false }).last().fill('fifty-record-proof');
  await otherPage.getByRole('button', { name: 'Import backup' }).click();
  await expect(otherPage.getByText('Imported 50 records in this demo.')).toBeVisible();
  await otherPage.getByRole('link', { name: 'Demo', exact: true }).click();
  await expect(otherPage.getByText('Showing 50 of 50 items')).toBeVisible();
  expect(Date.now() - started).toBeLessThan(600_000);
  await other.close();
});

test('@claim:remove-undo a removed record can be restored immediately', async ({ page }) => {
  await page.goto('/demo');
  page.once('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: 'Remove' }).first().click();
  await expect(page.getByText('Showing 2 of 2 items')).toBeVisible();
  await page.getByRole('button', { name: 'Undo' }).click();
  await expect(page.getByText('Showing 3 of 3 items')).toBeVisible();
});
