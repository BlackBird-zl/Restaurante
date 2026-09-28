// Usage: node scripts/qa/shot.mjs <url> <out.png> [width] [height] [fullPage]
import { chromium } from '@playwright/test';
const [url, out, w = '1440', h = '900', full = '1'] = process.argv.slice(2);
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: Number(w), height: Number(h) }, deviceScaleFactor: 1 });
await page.goto(url, { waitUntil: 'networkidle' });
await page.screenshot({ path: out, fullPage: full === '1' });
const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
console.log(out, 'horizontal overflow px:', overflow);
await browser.close();
