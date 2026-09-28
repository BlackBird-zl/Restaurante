// Manual QA: every admin page renders for the admin; media upload pipeline (validation, EXIF strip, variants);
// SVG rejected; draft preview; non-admin gets Forbidden. Screenshots to $QA_SHOTS (default /tmp/qa-shots).
import { chromium } from '@playwright/test';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import sharp from 'sharp';
const creds = JSON.parse(readFileSync('.demo-credentials.local.json', 'utf8')).users;
const pw = (e) => creds.find((u) => u.email === e).password;
const STAFF = process.env.QA_STAFF_URL ?? 'http://localhost:3000';
const out = process.env.QA_SHOTS ?? '/tmp/qa-shots';
mkdirSync(out, { recursive: true });
const SLUG = 'patio-do-ferro';
const results = [];
const check = (name, cond, extra = '') => { results.push({ name, ok: !!cond, extra }); console.log(cond ? 'PASS' : 'FAIL', name, extra); };
const browser = await chromium.launch();
async function login(email, viewport = { width: 1440, height: 900 }) {
  const ctx = await browser.newContext({ viewport });
  const page = await ctx.newPage();
  await page.goto(`${STAFF}/entrar`);
  await page.fill('#email', email); await page.fill('#password', pw(email));
  await Promise.all([page.waitForURL(/\/r\//), page.click('button[type=submit]')]);
  return { ctx, page };
}
const { page } = await login('marta@patio.example');
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
const pages = ['', '/carta/produtos', '/carta/produtos/novo', '/carta/categorias', '/estacoes', '/mesas', '/equipa', '/pedidos', '/chamados', '/contas',
  '/reservas', '/analytics', '/configuracoes', '/site', '/site/pre-visualizar'];
for (const p of pages) {
  const res = await page.goto(`${STAFF}/r/${SLUG}/admin${p}`, { waitUntil: 'networkidle' });
  const h1 = await page.locator('h1').first().textContent().catch(() => null);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  check(`admin${p || '/'} renders`, res.status() === 200 && h1, `h1="${h1?.trim()}" overflow=${overflow}`);
  await page.screenshot({ path: `${out}/admin${p.replace(/\//g, '_') || '_home'}.png`, fullPage: false });
}
// Media upload: a real JPEG with EXIF (incl. GPS-like comment) → variants without metadata.
const jpeg = await sharp({ create: { width: 1600, height: 1200, channels: 3, background: '#7a4a2a' } })
  .composite([{ input: Buffer.from('<svg width="1600" height="1200"><circle cx="800" cy="600" r="400" fill="#e8d9c0"/></svg>') }])
  .jpeg().withExif({ IFD0: { Copyright: 'QA-EXIF-MARKER', Artist: 'qa' } }).toBuffer();
writeFileSync(`${out}/upload.jpg`, jpeg);
check('fixture has EXIF', ((await sharp(jpeg).metadata()).exif?.length ?? 0) > 0);
await page.goto(`${STAFF}/r/${SLUG}/admin/site`, { waitUntil: 'networkidle' });
await page.getByRole('button', { name: 'Media' }).click();
await page.setInputFiles('input[type=file]', `${out}/upload.jpg`);
await page.selectOption('select[name=purpose]', 'product');
await page.fill('input[name=alt]', 'Imagem de teste QA — prato redondo sobre fundo castanho');
await page.getByRole('button', { name: 'Carregar' }).click();
await page.getByText(/Imagem carregada e convertida/).waitFor({ timeout: 20000 }).catch(() => {});
check('upload accepted', await page.getByText(/Imagem carregada e convertida/).count());
const media = await page.evaluate(async (slug) => {
  const r = await fetch(`/api/v1/staff/r/${slug}/menu/items`); return r.status;
}, SLUG);
check('admin menu API reachable', media === 200);
await page.waitForTimeout(800);
const img = page.locator('img[alt="Imagem de teste QA — prato redondo sobre fundo castanho"]').first();
const src = await img.getAttribute('src').catch(() => null);
check('uploaded media listed', !!src, src ?? '');
if (src) {
  const buf = Buffer.from(await (await fetch(src)).arrayBuffer());
  const m = await sharp(buf).metadata();
  check('variant served publicly (card)', m.width === 800 && (m.format === 'webp' || m.format === 'jpeg'), `${m.format} ${m.width}x${m.height}`);
  check('variant has no EXIF', !m.exif && !buf.includes(Buffer.from('QA-EXIF-MARKER')));
}
await page.screenshot({ path: `${out}/admin_site_media.png`, fullPage: true });
// SVG / fake extension rejected by signature.
const svgStatus = await page.evaluate(async (slug) => {
  const fd = new FormData();
  fd.append('file', new File(['<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'], 'x.jpg', { type: 'image/jpeg' }));
  fd.append('purpose', 'product'); fd.append('alt', 'svg disfarçado');
  const r = await fetch(`/api/v1/staff/r/${slug}/media`, { method: 'POST', body: fd, headers: { 'Idempotency-Key': crypto.randomUUID() } });
  return [r.status, (await r.json()).error?.details?.reason];
}, SLUG);
check('SVG disguised as JPEG rejected', svgStatus[0] === 400 && svgStatus[1] === 'unsupported_type', JSON.stringify(svgStatus));
// Non-admin (kitchen) cannot upload nor see admin.
const { page: diogo } = await login('ines@patio.example');
const kUp = await diogo.evaluate(async (slug) => {
  const fd = new FormData(); fd.append('file', new File([new Uint8Array(20)], 'a.jpg')); fd.append('purpose', 'product'); fd.append('alt', 'teste');
  const r = await fetch(`/api/v1/staff/r/${slug}/media`, { method: 'POST', body: fd, headers: { 'Idempotency-Key': crypto.randomUUID() } });
  return r.status;
}, SLUG);
check('kitchen member upload forbidden', kUp === 403, String(kUp));
await diogo.goto(`${STAFF}/r/${SLUG}/admin/site`);
check('kitchen member sees Forbidden on admin', await diogo.getByText(/sem permissão|não tem permissão/i).count(), '');
// Mobile admin
const { page: mob } = await login('marta@patio.example', { width: 390, height: 844 });
for (const p of ['/carta/produtos', '/mesas', '/reservas']) {
  await mob.goto(`${STAFF}/r/${SLUG}/admin${p}`, { waitUntil: 'networkidle' });
  const overflow = await mob.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  check(`mobile admin${p} no horizontal overflow`, overflow <= 0, `overflow=${overflow}`);
  await mob.screenshot({ path: `${out}/mobile_admin${p.replace(/\//g, '_')}.png` });
}
check('no uncaught page errors', errors.length === 0, errors.join(' | ').slice(0, 300));
await browser.close();
writeFileSync(`${out}/admin-flow-results.json`, JSON.stringify(results, null, 2));
const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);
