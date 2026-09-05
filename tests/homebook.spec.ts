import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

async function addItem(page: import('@playwright/test').Page, name: string, value = '1250') {
  const first = page.getByRole('button', { name: 'Add your first item' });
  if (await first.isVisible().catch(() => false)) await first.click();
  else await page.getByRole('button', { name: 'Add an item', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Item name').fill(name);
  await dialog.getByLabel(/Estimated value/).fill(value);
  await dialog.getByLabel('Serial or model').fill('CAM-4829');
  await dialog.getByLabel('Room', { exact: true }).fill('Office');
  await dialog.getByLabel('Container or exact spot').fill('Locked cabinet');
  await dialog.getByRole('button', { name: 'Add item', exact: true }).click();
}

test('adds, validates, persists, filters, removes, and restores a record', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1, name: 'Build your home insurance record' })).toBeVisible();
  await addItem(page, 'Mirrorless camera', '0');
  await expect(page.getByRole('heading', { name: 'Mirrorless camera' })).toBeVisible();
  await page.reload();
  await expect(page.getByText('CAM-4829')).toBeVisible();
  await page.getByLabel('Search records').fill('nothing-here');
  await page.getByRole('button', { name: 'Apply filters' }).click();
  await expect(page.getByRole('heading', { name: 'No records match' })).toBeVisible();
  await page.getByRole('button', { name: 'Clear filters' }).click();
  page.once('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: 'Remove' }).click();
  await expect(page.getByText('Mirrorless camera removed.')).toBeVisible();
  await page.getByRole('button', { name: 'Undo' }).click();
  await expect(page.getByRole('heading', { name: 'Mirrorless camera' })).toBeVisible();
  expect(errors).toEqual([]);
});

test('restores focus and keeps a draft when an update notice arrives', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller) await new Promise<void>(resolve => navigator.serviceWorker.addEventListener('controllerchange', () => resolve(), { once: true }));
  });
  await page.reload();
  const opener = page.getByRole('button', { name: 'Add your first item' });
  await opener.click();
  const name = page.getByLabel('Item name');
  await name.fill('Unsaved television draft');
  await page.evaluate(() => navigator.serviceWorker.dispatchEvent(new MessageEvent('message', { data: { type: 'UPDATE_READY' } })));
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(name).toHaveValue('Unsaved television draft');
  await page.keyboard.press('Escape');
  await expect(opener).toBeFocused();
});

test('updates route titles, headings, history focus, and unknown-route content', async ({ page }) => {
  await page.goto('/demo');
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://claim-ready-homebook.sociobot.in/demo');
  await page.goto('/');
  await page.getByRole('link', { name: 'Export', exact: true }).click();
  await expect(page).toHaveTitle('Export home records — Claim-Ready Homebook');
  await expect(page.locator('h1')).toHaveText('Export your home records');
  await page.goBack();
  await expect(page).toHaveTitle('Claim-Ready Homebook — Build a home inventory');
  await expect(page.locator('h1')).toBeFocused();
  await page.goto('/definitely-missing-review-path');
  await expect(page).toHaveTitle('Page not found — Claim-Ready Homebook');
  await expect(page.getByRole('heading', { level: 1, name: 'Page not found' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Return to your inventory' })).toBeVisible();
});

test('has accessible populated routes, touch targets, reduced motion, and 200 percent text resize', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const path of ['/demo', '/export?demo=1', '/guide', '/privacy', '/terms']) {
    await page.goto(path);
    await expect(page.locator('h1')).toHaveCount(1);
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations.filter(violation => ['serious', 'critical'].includes(violation.impact || '')), path).toEqual([]);
  }
  await page.goto('/demo');
  for (const name of ['Edit', 'Remove']) {
    const box = await page.getByRole('button', { name, exact: true }).first().boundingBox();
    expect(box?.height).toBeGreaterThanOrEqual(44);
    expect(box?.width).toBeGreaterThanOrEqual(44);
  }
  const termsBox = await page.getByRole('link', { name: 'Terms', exact: true }).boundingBox();
  expect(termsBox?.height).toBeGreaterThanOrEqual(44);
  expect(termsBox?.width).toBeGreaterThanOrEqual(44);
  await page.addStyleTag({ content: ':root { font-size: 32px !important; }' });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  expect(await page.locator('.button').first().evaluate(element => parseFloat(getComputedStyle(element).transitionDuration))).toBeLessThanOrEqual(0.00001);
});

test('accepts the documented value boundaries and rejects values outside them', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Add your first item' }).click();
  const dialog = page.getByRole('dialog');
  const name = dialog.getByLabel('Item name');
  expect(await name.evaluate((input: HTMLInputElement) => input.checkValidity())).toBe(false);
  await name.fill('Boundary item');
  const value = dialog.getByLabel(/Estimated value/);
  for (const accepted of ['0', '100000000']) {
    await value.fill(accepted);
    expect(await value.evaluate((input: HTMLInputElement) => input.checkValidity())).toBe(true);
  }
  for (const rejected of ['-0.01', '100000000.01']) {
    await value.fill(rejected);
    expect(await value.evaluate((input: HTMLInputElement) => input.checkValidity())).toBe(false);
  }
  await page.keyboard.press('Escape');
  await page.getByRole('link', { name: 'Demo' }).click();
  await page.getByRole('link', { name: 'Export', exact: true }).click();
  const passphrase = page.getByLabel('Passphrase', { exact: false }).first();
  await passphrase.fill('ninechars');
  expect(await passphrase.evaluate((input: HTMLInputElement) => input.checkValidity())).toBe(false);
});
