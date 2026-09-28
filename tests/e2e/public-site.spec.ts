import { expect, test } from '@playwright/test';
import { BALCAO, noHorizontalOverflow, overflowCulprits, PATIO } from './helpers';

const PAGES = ['/', '/carta', '/sobre', '/ambiente', '/contactos', '/reservas', '/privacidade'];
const WIDTHS = [320, 360, 390, 768, 1024, 1440];

test.describe('public site (both tenants)', () => {
  test('every internal link from every page resolves (no 404/500)', async ({ page }) => {
    for (const origin of [PATIO, BALCAO]) {
      const seen = new Set<string>(); const queue = PAGES.map((p) => `${origin}${p}`);
      const bad: string[] = [];
      while (queue.length && seen.size < 80) {
        const url = queue.shift()!;
        if (seen.has(url)) continue;
        seen.add(url);
        const res = await page.goto(url);
        if (!res || res.status() >= 400) { bad.push(`${url} → ${res?.status()}`); continue; }
        const hrefs = await page.$$eval('a[href]', (as) => as.map((a) => (a as HTMLAnchorElement).href));
        for (const h of hrefs) if (h.startsWith(origin) && !h.includes('#') && !seen.has(h)) queue.push(h);
      }
      expect(bad, bad.join('\n')).toEqual([]);
      expect(seen.size).toBeGreaterThan(10);
    }
  });

  test('no horizontal overflow at 320–1440 px and images carry alt text', async ({ browser }) => {
    for (const width of WIDTHS) {
      // Phones/tablets use overlay scrollbars; desktop widths keep the classic scrollbar.
      const ctx = await browser.newContext({ viewport: { width, height: 900 }, isMobile: width < 1024, hasTouch: width < 1024 });
      const page = await ctx.newPage();
      for (const p of ['/', '/carta', '/reservas']) {
        await page.goto(`${PATIO}${p}`, { waitUntil: 'networkidle' });
        expect(await noHorizontalOverflow(page), `${width}px ${p}: ${await overflowCulprits(page)}`).toBeLessThanOrEqual(0);
        const missingAlt = await page.$$eval('img', (imgs) => imgs.filter((i) => !i.hasAttribute('alt')).length);
        expect(missingAlt, `${width}px ${p} img without alt`).toBe(0);
      }
      await ctx.close();
    }
  });

  test('placeholders are clearly identified, never passed off as photographs', async ({ page }) => {
    await page.goto(`${PATIO}/`);
    await expect(page.getByText(/Fotografia pendente/i).first()).toBeVisible();
  });

  test('no console errors on public pages', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    page.on('pageerror', (e) => errors.push(e.message));
    for (const p of PAGES) await page.goto(`${PATIO}${p}`, { waitUntil: 'networkidle' });
    expect(errors).toEqual([]);
  });

  test('menu shows allergen notice and prices in euros', async ({ page }) => {
    await page.goto(`${PATIO}/carta`);
    await expect(page.getByText(/€/).first()).toBeVisible();
    await page.getByRole('link', { name: /Hambúrguer do Pátio/ }).first().click();
    await expect(page.getByText(/alerg/i).first()).toBeVisible();
  });

  test('reservation request shows a reference and says it is not yet confirmed', async ({ page }) => {
    await page.goto(`${PATIO}/reservas`);
    await expect(page.getByText(/confirma/i).first()).toBeVisible();
    await page.getByLabel(/Nome/).fill('Teste E2E');
    await page.getByLabel(/Email/i).fill('e2e@example.test');
    const date = page.getByLabel(/Data/);
    // Choose the first date that offers slots (published hours).
    for (let i = 2; i < 14; i++) {
      const d = new Date(Date.now() + i * 86_400_000).toISOString().slice(0, 10);
      await date.fill(d);
      if (await page.getByLabel(/Hora/).locator('option').count() > 1) break;
    }
    await page.getByLabel(/Hora/).selectOption({ index: 1 });
    await page.waitForTimeout(2600); // minimum fill time (anti-bot)
    await page.getByRole('button', { name: /Enviar pedido|Pedir reserva/ }).click();
    await expect(page.getByText(/Referência|referência/).first()).toBeVisible();
  });
});
