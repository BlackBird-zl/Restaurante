'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, type ReactNode } from 'react';
import { ConnectionBanner, ConnectionDot } from '@/lib/realtime/connection';
import { formatEUR } from '@/lib/money';
import { Icon } from '@/components/ui/Icon';
import { useTable } from './TableProvider';
import { ServiceCallSheet } from './ServiceCallSheet';
import s from './table.module.css';

export function TableShell({ children, drinksHref }: { children: ReactNode; drinksHref: string | null }) {
  const t = useTable();
  const pathname = usePathname() ?? '';
  const [helpOpen, setHelpOpen] = useState(false);
  const base = t.url();
  const units = t.cart.reduce((a, l) => a + l.quantity, 0);
  const estimate = t.cart.reduce((a, l) => a + l.quantity * l.expectedPriceCents, 0);
  const isActive = (p: string) => (p === '' ? pathname === base : pathname.startsWith(base + p));
  const activeCalls = t.snapshot?.calls.filter((c) => c.status === 'new' || c.status === 'claimed').length ?? 0;

  return (
    <div className={s.shell}>
      <header className={s.top}>
        <div className={s.topInner}>
          <Link href={base} className={s.brand} style={{ textDecoration: 'none' }}>
            <span className={s.brandName}>{t.restaurantName}</span>
            <span className={s.brandTable}>Mesa {t.label}</span>
          </Link>
          {t.mode === 'session' && !t.ended ? <ConnectionDot state={t.conn} /> : null}
        </div>
        {t.mode === 'session' && !t.ended ? <ConnectionBanner state={t.conn} lastSuccessAt={t.lastSuccessAt} onRetry={() => void t.refresh()} /> : null}
      </header>
      <noscript>
        <p style={{ padding: 16, background: '#fcf0d9' }}>Ative o JavaScript para pedir à mesa. A carta continua disponível.</p>
      </noscript>
      <main id="conteudo" className={s.content}>{t.ended ? <Ended reason={t.ended} base={base} /> : children}</main>

      {t.mode === 'session' && !t.ended && units > 0 && !pathname.startsWith(`${base}/carrinho`) ? (
        <Link href={`${base}/carrinho`} className={s.cartBar} aria-label={`Ver pedido: ${units} unidades, total estimado ${formatEUR(estimate)}`}>
          <span><strong>{units} {units === 1 ? 'item' : 'itens'}</strong> · <span className="tabular">{formatEUR(estimate)}</span></span>
          <span className={s.cartBarGo}>Ver pedido <Icon name="arrowRight" size={18} /></span>
        </Link>
      ) : null}

      {t.mode === 'session' && !t.ended ? (
        <nav className={s.nav} aria-label="Mesa">
          <div className={s.navInner}>
            <Link className={s.navItem} href={`${base}/carta`} aria-current={isActive('/carta') ? 'page' : undefined}><Icon name="list" size={22} />Carta</Link>
            <Link className={s.navItem} href={`${base}/pedidos`} aria-current={isActive('/pedidos') ? 'page' : undefined}><Icon name="clock" size={22} />Pedidos</Link>
            <Link className={s.navItem} href={`${base}/conta`} aria-current={isActive('/conta') ? 'page' : undefined}><Icon name="receipt" size={22} />Conta</Link>
            <button type="button" className={s.navItem} onClick={() => setHelpOpen(true)} aria-haspopup="dialog">
              <Icon name="bell" size={22} />Ajuda
              {activeCalls ? <span className={s.navBadge} aria-label={`${activeCalls} chamado ativo`}>{activeCalls}</span> : null}
            </button>
          </div>
        </nav>
      ) : null}
      {t.mode === 'session' ? <ServiceCallSheet open={helpOpen} onOpenChange={setHelpOpen} drinksHref={drinksHref} /> : null}
    </div>
  );
}

function Ended({ reason, base }: { reason: 'VISIT_CLOSED' | 'GUEST_SESSION_EXPIRED'; base: string }) {
  return (
    <div className={s.hello} role="status">
      <h1 className={s.helloTitle}>{reason === 'VISIT_CLOSED' ? 'Este atendimento terminou.' : 'O acesso a esta mesa expirou.'}</h1>
      <p className={s.muted}>{reason === 'VISIT_CLOSED'
        ? 'Obrigado pela visita. Para voltar a pedir, é preciso um novo atendimento aberto pela equipa.'
        : 'Peça um novo código à equipa para continuar a pedir.'}</p>
      <a className={s.actionBtn} href={`${base}/carta`}><Icon name="list" />Ver a carta<span /></a>
    </div>
  );
}
