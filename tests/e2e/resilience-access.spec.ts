import { expect, test } from '@playwright/test';
import { guest, PATIO, qrUrlFor, SLUG, STAFF, staff } from './helpers';

test.describe('realtime unavailable → polling fallback; offline blocks actions', () => {
  test('KDS without realtime shows "Atualização automática" and still receives a new order', async ({ browser }) => {
    // The local stack has no Realtime server (documented), so this is the polling path.
    const rui = await staff(browser, 'rui@patio.example');
    const marta = await staff(browser, 'marta@patio.example');
    const ines = await staff(browser, 'ines@patio.example', { width: 1024, height: 768 });
    await ines.page.goto(`${STAFF}/r/${SLUG}/op/cozinha`);
    await expect(ines.page.getByText('Atualização automática')).toBeVisible();

    await rui.page.goto(`${STAFF}/r/${SLUG}/op/salao`);
    await rui.page.getByRole('button', { name: /^Mesa 10,/ }).click();
    await rui.page.getByRole('button', { name: /Abrir atendimento/ }).click();
    const code = (await rui.page.locator('text=/^\\d{3} \\d{3}$/').first().textContent())!.replace(' ', '');
    const g = await guest(browser);
    await g.page.goto(await qrUrlFor(marta.page, '10'));
    await g.page.fill('input[autocomplete=one-time-code]', code);
    await Promise.all([g.page.waitForURL(/\/carta$/), g.page.click('button[type=submit]')]);
    await g.page.getByRole('button', { name: 'Adicionar Arroz de cogumelos' }).click();
    await g.page.getByRole('link', { name: /Ver pedido/ }).click();
    await g.page.waitForURL(/\/carrinho$/);
    await expect(g.page.getByRole('button', { name: /Adicionar à conta da Mesa 10/ })).toBeEnabled();

    await test.step('offline guest cannot submit and sees why', async () => {
      await g.ctx.setOffline(true);
      await expect(g.page.getByText(/Sem ligação/).first()).toBeVisible({ timeout: 20_000 });
      await expect(g.page.getByRole('button', { name: /Adicionar à conta da Mesa 10/ })).toBeDisabled();
      await g.ctx.setOffline(false);
      await expect(g.page.getByRole('button', { name: /Adicionar à conta da Mesa 10/ })).toBeEnabled({ timeout: 20_000 });
    });

    const t0 = Date.now();
    await g.page.getByRole('button', { name: /Adicionar à conta da Mesa 10/ }).click();
    await expect(g.page.getByText('Pedido recebido.')).toBeVisible();
    await expect(ines.page.getByRole('article', { name: /^Mesa 10, pedido/ })).toBeVisible({ timeout: 10_000 });
    test.info().annotations.push({ type: 'kds-latency-ms', description: String(Date.now() - t0) });
    await ines.page.screenshot({ path: 'test-results/kds-tablet-1024.png' });

    await test.step('staff offline: mutations disabled, banner shown', async () => {
      await ines.ctx.setOffline(true);
      await expect(ines.page.getByText(/Sem ligação/).first()).toBeVisible({ timeout: 20_000 });
      await expect(ines.page.getByRole('article', { name: /^Mesa 10, pedido/ }).getByRole('button', { name: /^Iniciar/ })).toBeDisabled();
      await ines.ctx.setOffline(false);
    });
    for (const c of [rui, marta, ines, g]) await c.ctx.close();
  });
});

test.describe('access control in the UI', () => {
  test('unauthenticated staff routes redirect to login with a safe next', async ({ page }) => {
    await page.goto(`${STAFF}/r/${SLUG}/op/caixa`);
    await expect(page).toHaveURL(/\/entrar\?next=%2Fr%2Fpatio-do-ferro%2Fop%2Fcaixa/);
  });
  test('kitchen member sees 403 on cashier and admin, and only its workspace in the nav', async ({ browser }) => {
    const ines = await staff(browser, 'ines@patio.example');
    for (const p of ['/op/caixa', '/op/salao', '/admin']) {
      await ines.page.goto(`${STAFF}/r/${SLUG}${p}`);
      await expect(ines.page.getByRole('heading', { name: 'Sem permissão para esta área' })).toBeVisible();
    }
    await expect(ines.page.getByRole('link', { name: 'Caixa' })).toHaveCount(0);
    await ines.ctx.close();
  });
  test('login with wrong password shows a neutral error', async ({ page }) => {
    await page.goto(`${STAFF}/entrar`);
    await page.fill('#email', 'rui@patio.example');
    await page.fill('#password', 'errada-123456');
    await page.click('button[type=submit]');
    await expect(page).toHaveURL(/erro=credenciais/);
    await expect(page.getByText(/Email ou palavra-passe|credenciais/i).first()).toBeVisible();
  });
  test('tenant host never serves the staff login', async ({ page }) => {
    const r = await page.goto(`${PATIO}/entrar`);
    expect(r?.status()).toBe(404);
  });
});
