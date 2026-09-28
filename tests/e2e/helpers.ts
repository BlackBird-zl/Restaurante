import { expect, type Browser, type BrowserContext, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import jsQR from 'jsqr';
import { PNG } from 'pngjs';

export const SLUG = 'patio-do-ferro';
export const PORT = Number(process.env.QA_APP_PORT ?? 3000);
export const STAFF = `http://localhost:${PORT}`;
export const PATIO = `http://patio-do-ferro.localhost:${PORT}`;
export const BALCAO = `http://balcao-do-largo.localhost:${PORT}`;

export function password(email: string) {
  const c = JSON.parse(readFileSync('.demo-credentials.local.json', 'utf8')) as { users: { email: string; password: string }[] };
  return c.users.find((u) => u.email === email)!.password;
}

export async function staff(browser: Browser, email: string, viewport = { width: 1280, height: 860 }): Promise<{ ctx: BrowserContext; page: Page }> {
  const ctx = await browser.newContext({ viewport, locale: 'pt-PT', timezoneId: 'Europe/Lisbon' });
  const page = await ctx.newPage();
  await page.goto(`${STAFF}/entrar`);
  await page.fill('#email', email);
  await page.fill('#password', password(email));
  await Promise.all([page.waitForURL(/\/r\//), page.click('button[type=submit]')]);
  return { ctx, page };
}

export async function guest(browser: Browser, viewport = { width: 390, height: 844 }) {
  const ctx = await browser.newContext({ viewport, isMobile: true, hasTouch: true, locale: 'pt-PT', timezoneId: 'Europe/Lisbon' });
  return { ctx, page: await ctx.newPage() };
}

/** Admin downloads the printable PNG; the test decodes it like a phone camera would. */
export async function qrUrlFor(adminPage: Page, label: string): Promise<string> {
  const tables = await adminPage.evaluate(async (slug) => (await (await fetch(`/api/v1/staff/r/${slug}/tables`)).json()).data.tables as { id: string; label: string }[], SLUG);
  const t = tables.find((x) => x.label === label)!;
  const bytes = await adminPage.evaluate(async ([slug, id]) => {
    const r = await fetch(`/api/v1/staff/r/${slug}/tables/${id}/qr?format=png`);
    return Array.from(new Uint8Array(await r.arrayBuffer()));
  }, [SLUG, t.id] as const);
  const img = PNG.sync.read(Buffer.from(bytes));
  const qr = jsQR(new Uint8ClampedArray(img.data), img.width, img.height);
  expect(qr, 'QR decodable').not.toBeNull();
  return qr!.data;
}

export async function noHorizontalOverflow(page: Page) {
  return page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
}

/** Elements sticking out of the viewport (outside horizontal scrollers) — for failure messages. */
export async function overflowCulprits(page: Page) {
  return page.evaluate(() => {
    const w = document.documentElement.clientWidth;
    const inScroller = (e: Element) => { for (let p = e.parentElement; p; p = p.parentElement) { const o = getComputedStyle(p).overflowX; if (o === 'auto' || o === 'scroll' || o === 'hidden') return true; } return false; };
    return [...document.querySelectorAll('body *')].filter((e) => e.getBoundingClientRect().right > w + 0.5 && !inScroller(e))
      .slice(0, 5).map((e) => `${e.tagName}.${String(e.className).slice(0, 40)} right=${Math.round(e.getBoundingClientRect().right)}`).join(' | ');
  });
}
