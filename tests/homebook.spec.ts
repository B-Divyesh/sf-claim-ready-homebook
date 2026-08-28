import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('adds, persists, filters, and removes an inventory record', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await page.goto('/');
  await expect(page.locator('h1')).toHaveCount(1);
  await expect(page.getByRole('heading', { name: /Turn a roomful/ })).toBeVisible();
  await page.getByRole('button', { name: 'Add your first item' }).click();
  await page.getByLabel('Item name').fill('Mirrorless camera');
  await page.getByLabel('Category').selectOption('Electronics');
  await page.getByLabel(/Estimated value/).fill('1250');
  await page.getByLabel('Purchase date').fill('2025-06-10');
  await page.getByLabel('Serial or model').fill('CAM-4829');
  await page.getByRole('combobox', { name: 'Room', exact: true }).fill('Office');
  await page.getByLabel('Container or exact spot').fill('Locked cabinet');
  await page.getByRole('button', { name: 'Add item', exact: true }).last().click();
  await expect(page.getByRole('heading', { name: 'Mirrorless camera' })).toBeVisible();
  await page.reload();
  await expect(page.getByText('CAM-4829')).toBeVisible();
  await page.getByLabel('Search records').fill('nothing-here');
  await page.getByRole('button', { name: 'Apply filters' }).click();
  await expect(page.getByRole('heading', { name: 'No records match' })).toBeVisible();
  await page.getByRole('button', { name: 'Clear filters' }).click();
  await expect(page.getByRole('heading', { name: 'Mirrorless camera' })).toBeVisible();
  expect(errors).toEqual([]);
});

test('exports CSV, PDF, and an encrypted backup that reopens', async ({ page, browser }) => {
  await page.goto('/');
  if (await page.getByRole('heading', { name: /Turn a roomful/ }).isVisible()) {
    await page.getByRole('button', { name: 'Add your first item' }).click();
    await page.getByLabel('Item name').fill('Oak desk');
    await page.getByRole('button', { name: 'Add item', exact: true }).last().click();
    await expect(page.getByRole('dialog')).toBeHidden();
  }
  await page.getByRole('link', { name: 'Export', exact: true }).click();
  const csvDownload = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export CSV' }).click();
  expect((await csvDownload).suggestedFilename()).toContain('homebook-claim-list');
  await page.getByLabel('Passphrase', { exact: false }).first().fill('portable-proof-2026');
  await page.getByText('I understand this passphrase cannot be recovered.').click();
  const backupDownload = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download encrypted backup' }).click();
  const backup = await backupDownload;
  expect(backup.suggestedFilename()).toContain('.homebook');
  const backupPath = await backup.path();
  expect(backupPath).toBeTruthy();

  await page.evaluate(() => {
    localStorage.setItem('sb_license:claim-ready-homebook', 'test-license');
    localStorage.setItem('sb_license_verdict:claim-ready-homebook', JSON.stringify({ valid: true, checkedAt: Date.now() }));
  });
  await page.reload();
  const pdfDownload = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Build claim PDF' }).click();
  expect((await pdfDownload).suggestedFilename()).toContain('.pdf');

  const secondDevice = await browser.newContext();
  const secondPage = await secondDevice.newPage();
  await secondPage.goto('/export');
  await secondPage.getByText('Move or restore a homebook').click();
  await secondPage.getByLabel('Backup file').setInputFiles(backupPath!);
  await secondPage.getByLabel('Passphrase', { exact: false }).last().fill('portable-proof-2026');
  await secondPage.getByRole('button', { name: 'Import backup' }).click();
  await expect(secondPage.getByText(/Imported 1 record/)).toBeVisible();
  await secondPage.getByRole('link', { name: 'Inventory', exact: true }).click();
  await expect(secondPage.getByRole('heading', { name: 'Oak desk' })).toBeVisible();
  await secondDevice.close();
});

test('has no serious accessibility violations', async ({ page }) => {
  await page.goto('/privacy');
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations.filter(violation => ['serious', 'critical'].includes(violation.impact || ''))).toEqual([]);
});

test('reloads offline after the service worker has installed', async ({ page, context }) => {
  await page.goto('/');
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller) await new Promise<void>(resolve => navigator.serviceWorker.addEventListener('controllerchange', () => resolve(), { once: true }));
  });
  await page.reload();
  await expect(page.locator('main')).toBeVisible();
  await context.setOffline(true);
  await page.reload();
  await expect(page.locator('main')).toBeVisible();
  await expect(page.getByText(/Offline • records still available/)).toBeVisible();
});
