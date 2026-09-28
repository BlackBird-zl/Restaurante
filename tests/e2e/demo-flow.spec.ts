import { expect, test } from '@playwright/test';
import { guest, PATIO, qrUrlFor, SLUG, STAFF, staff } from './helpers';

/**
 * Demo script (Plano §12) end to end with separate browser contexts per role:
 * salão abre Mesa 14 → cliente lê o QR impresso e entra com o código → pedido misto →
 * cozinha e bar preparam → salão entrega → chamado → pedido de conta → caixa regista pagamento externo →
 * sessão do cliente termina e a mesa fica livre.
 */
test('full service cycle across roles (Mesa 14)', async ({ browser }) => {
  const rui = await staff(browser, 'rui@patio.example');
  const marta = await staff(browser, 'marta@patio.example');
  const ines = await staff(browser, 'ines@patio.example');
  const tomas = await staff(browser, 'tomas@patio.example');
  const leonor = await staff(browser, 'leonor@patio.example');
  const g = await guest(browser);

  let code = '';
  await test.step('salão abre a mesa e vê o código uma vez', async () => {
    await rui.page.goto(`${STAFF}/r/${SLUG}/op/salao`);
    await rui.page.getByRole('button', { name: /^Mesa 14,/ }).click();
    await rui.page.getByRole('button', { name: /Abrir atendimento/ }).click();
    code = (await rui.page.locator('text=/^\\d{3} \\d{3}$/').first().textContent())!.replace(' ', '');
    expect(code).toMatch(/^\d{6}$/);
    await rui.page.keyboard.press('Escape');
  });

  await test.step('cliente lê o QR impresso e entra com o código', async () => {
    const url = await qrUrlFor(marta.page, '14');
    expect(url).toMatch(/\/mesa\/14\?q=/);
    await g.page.goto(url);
    await expect(g.page).not.toHaveURL(/q=/);
    await g.page.fill('input[autocomplete=one-time-code]', code);
    await Promise.all([g.page.waitForURL(/\/carta$/), g.page.click('button[type=submit]')]);
    await expect(g.page.getByText('Mesa 14').first()).toBeVisible();
  });

  await test.step('cliente envia pedido misto (cozinha + bar)', async () => {
    for (const [name, n] of [['Hambúrguer do Pátio', 2], ['Batata frita', 1], ['Cola', 2]] as const) {
      for (let i = 0; i < n; i++) await g.page.getByRole('button', { name: `Adicionar ${name}` }).click();
    }
    await g.page.getByRole('link', { name: /Ver pedido/ }).click();
    await expect(g.page).toHaveURL(/\/carrinho$/);
    await expect(g.page.getByRole('main').getByText('Hambúrguer do Pátio').first()).toBeVisible();
    await expect(g.page.getByRole('main').getByText('40,50 €').first()).toBeVisible(); // Plano §6: P10×2 + P11 + P19×2
    await g.page.getByRole('button', { name: /Adicionar à conta da Mesa 14/ }).click();
    await expect(g.page.getByText('Pedido recebido.')).toBeVisible();
    await g.page.reload();
    await g.page.goto(`${PATIO}/mesa/14/conta`);
    await expect(g.page.getByText('40,50 €').first()).toBeVisible(); // persisted, server-computed
  });

  await test.step('cozinha recebe apenas as linhas de cozinha e prepara', async () => {
    await ines.page.goto(`${STAFF}/r/${SLUG}/op/cozinha`);
    const ticket = ines.page.getByRole('article', { name: /^Mesa 14, pedido/ }).first();
    await expect(ticket).toBeVisible();
    await expect(ticket.getByText('Hambúrguer do Pátio')).toBeVisible();
    await expect(ticket.getByText('Cola')).toHaveCount(0);
    await ticket.getByRole('button', { name: /^Iniciar/ }).click();
    const mine = ines.page.getByRole('article', { name: /^Mesa 14, pedido/ });
    const all = mine.getByRole('button', { name: /Tudo pronto \(2\)/ });
    await expect(all).toBeVisible();
    await all.click();
    await expect(ines.page.getByText('A aguardar recolha pelo salão.').first()).toBeVisible();
  });

  await test.step('bar prepara as bebidas', async () => {
    await tomas.page.goto(`${STAFF}/r/${SLUG}/op/bar`);
    const ticket = tomas.page.getByRole('article', { name: /^Mesa 14, pedido/ }).first();
    await expect(ticket.getByText('Cola')).toBeVisible();
    await expect(ticket.getByText('Hambúrguer do Pátio')).toHaveCount(0);
    await ticket.getByRole('button', { name: /^Iniciar/ }).click();
    const t14 = tomas.page.getByRole('article', { name: /^Mesa 14, pedido/ });
    const ready = t14.getByRole('button', { name: /^(Tudo pronto|Pronto)/ }).first();
    await expect(ready).toBeVisible();
    await ready.click();
    await expect(tomas.page.getByText('A aguardar recolha pelo salão.').first()).toBeVisible();
  });

  await test.step('cliente vê o estado a mudar sem recarregar (polling)', async () => {
    await g.page.goto(`${PATIO}/mesa/14/pedidos`);
    await expect(g.page.getByText(/Pronto/).first()).toBeVisible({ timeout: 15_000 });
  });

  await test.step('salão leva e entrega', async () => {
    await rui.page.goto(`${STAFF}/r/${SLUG}/op/salao`);
    const card = rui.page.getByRole('article', { name: 'Mesa 14' });
    await expect(card).toBeVisible({ timeout: 15_000 });
    await card.getByRole('button', { name: /Vou levar/ }).click();
    await card.getByRole('button', { name: /Entregue/ }).click();
    await expect(rui.page.getByRole('article', { name: 'Mesa 14' })).toHaveCount(0, { timeout: 15_000 });
  });

  await test.step('cliente chama a equipa; salão assume e conclui', async () => {
    await g.page.getByRole('button', { name: /Ajuda/ }).click();
    await g.page.getByRole('button', { name: /Talheres/ }).click();
    await expect(g.page.getByText(/Pedido ativo|enviado/i).first()).toBeVisible();
    await g.page.keyboard.press('Escape');
    const call = rui.page.getByRole('article', { name: /Mesa 14: Talheres/ });
    await expect(call).toBeVisible({ timeout: 15_000 });
    await call.getByRole('button', { name: 'Assumir' }).click();
    await call.getByRole('button', { name: 'Concluir' }).click();
    await expect(call).toHaveCount(0, { timeout: 15_000 });
  });

  await test.step('cliente pede a conta (não é pagamento)', async () => {
    await g.page.goto(`${PATIO}/mesa/14/conta`);
    await expect(g.page.getByText('Total atual')).toBeVisible();
    await g.page.getByRole('main').getByRole('button', { name: 'Pedir a conta' }).click();
    const confirm = g.page.getByRole('group', { name: 'Confirmar pedido de conta' });
    await expect(confirm.getByText(/não é um pagamento/)).toBeVisible();
    await confirm.getByRole('button', { name: 'Pedir a conta' }).click();
    await expect(g.page.getByText(/Já não é possível adicionar pedidos/)).toBeVisible();
  });

  await test.step('caixa regista o recebimento externo e fecha', async () => {
    await leonor.page.goto(`${STAFF}/r/${SLUG}/op/caixa`);
    await leonor.page.getByRole('button', { name: /Mesa 14/ }).first().click();
    await leonor.page.getByRole('radio', { name: /Cartão|terminal/i }).check();
    await leonor.page.getByRole('button', { name: 'Registar recebimento e fechar' }).first().click();
    await leonor.page.getByRole('dialog').getByRole('button', { name: 'Registar recebimento e fechar' }).click();
    await expect(leonor.page.getByText(/Mesa 14 ·/).first()).toBeVisible({ timeout: 15_000 });
  });

  await test.step('sessão do cliente termina; mesa livre', async () => {
    await expect(g.page.getByText(/Este atendimento terminou|O acesso a esta mesa expirou/)).toBeVisible({ timeout: 15_000 });
    await rui.page.goto(`${STAFF}/r/${SLUG}/op/salao`);
    await expect(rui.page.getByRole('button', { name: /^Mesa 14, Livre/i })).toBeVisible();
  });

  await g.page.screenshot({ path: 'test-results/demo-guest-end.png' });
  for (const c of [rui, marta, ines, tomas, leonor, g]) await c.ctx.close();
});
