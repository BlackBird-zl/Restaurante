// Quick manual smoke of the vertical flow in real browsers (separate contexts per role).
import { chromium } from '@playwright/test';
import { readFileSync } from 'node:fs';
import jsQR from 'jsqr';
import { PNG } from 'pngjs';
const creds = JSON.parse(readFileSync('.demo-credentials.local.json', 'utf8')).users;
const pw = (e) => creds.find((u) => u.email === e).password;
const STAFF = 'http://localhost:3000';
const out = '/tmp/claude-0/shots';
const browser = await chromium.launch();
async function login(email) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 860 } });
  const page = await ctx.newPage();
  await page.goto(`${STAFF}/entrar`);
  await page.fill('#email', email); await page.fill('#password', pw(email));
  await Promise.all([page.waitForURL(/\/r\//), page.click('button[type=submit]')]);
  return { ctx, page };
}
const rui = await login('rui@patio.example');
await rui.page.goto(`${STAFF}/r/patio-do-ferro/op/salao`);
await rui.page.getByRole('button', { name: /Mesa 14,/ }).click();
await rui.page.getByRole('button', { name: /Abrir atendimento/ }).click();
const codeText = await rui.page.locator('text=/^\\d{3} \\d{3}$/').first().textContent();
const code = codeText.replace(' ', '');
console.log('code', code);
await rui.page.screenshot({ path: `${out}/salao-code.png` });
// Admin downloads QR PNG and we decode it
const marta = await login('marta@patio.example');
const tables = await marta.page.evaluate(async () => (await (await fetch('/api/v1/staff/r/patio-do-ferro/tables')).json()).data.tables);
const t14 = tables.find((t) => t.label === '14');
const png = await marta.page.evaluate(async (id) => {
  const r = await fetch(`/api/v1/staff/r/patio-do-ferro/tables/${id}/qr?format=png`);
  return Array.from(new Uint8Array(await r.arrayBuffer()));
}, t14.id);
const img = PNG.sync.read(Buffer.from(png));
const qr = jsQR(new Uint8ClampedArray(img.data), img.width, img.height);
console.log('qr url', qr.data.replace(/q=.*/, 'q=<token>'));
// Guest on mobile
const g = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
const gp = await g.newPage();
await gp.goto(qr.data);
console.log('guest after QR', gp.url());
await gp.fill('input[autocomplete=one-time-code]', code);
await Promise.all([gp.waitForURL(/\/carta$/), gp.click('button[type=submit]')]);
await gp.screenshot({ path: `${out}/mesa-carta.png`, fullPage: false });
for (const [name, n] of [['Hambúrguer do Pátio', 2], ['Batata frita', 1], ['Cola', 2]]) {
  for (let i = 0; i < n; i++) await gp.getByRole('button', { name: `Adicionar ${name}` }).click();
}
await gp.getByRole('link', { name: /Ver pedido/ }).click();
await gp.screenshot({ path: `${out}/mesa-carrinho.png`, fullPage: true });
await gp.getByRole('button', { name: /Adicionar à conta da Mesa 14/ }).click();
await gp.getByText('Pedido recebido.').waitFor();
await gp.screenshot({ path: `${out}/mesa-recebido.png`, fullPage: true });
console.log('order sent');
const ines = await login('ines@patio.example');
await ines.page.goto(`${STAFF}/r/patio-do-ferro/op/cozinha`);
await ines.page.getByText('Mesa 14').first().waitFor();
await ines.page.screenshot({ path: `${out}/kds-cozinha.png`, fullPage: true });
const tomas = await login('tomas@patio.example');
await tomas.page.goto(`${STAFF}/r/patio-do-ferro/op/bar`);
await tomas.page.getByText('Mesa 14').first().waitFor();
await tomas.page.screenshot({ path: `${out}/kds-bar.png`, fullPage: true });
const leonor = await login('leonor@patio.example');
await leonor.page.goto(`${STAFF}/r/patio-do-ferro/op/caixa`);
await leonor.page.waitForTimeout(1500);
await leonor.page.screenshot({ path: `${out}/caixa.png`, fullPage: true });
await rui.page.keyboard.press('Escape');
await rui.page.waitForTimeout(1000);
await rui.page.screenshot({ path: `${out}/salao.png`, fullPage: true });
await browser.close();
console.log('done');
