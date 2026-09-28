'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { CSSProperties, ReactNode } from 'react';
import { QueryProvider } from '@/lib/realtime/connection';
import { ROLE_LABEL } from '@/modules/orders/status';
import { Icon, type IconName } from '@/components/ui/Icon';
import { StaffRealtime } from './StaffRealtime';
import s from './staff.module.css';

export type StaffMe = {
  restaurantId: string; memberId: string; displayName: string; roles: string[]; isOwner: boolean;
  restaurant: { slug: string; name: string; isDemo: boolean; accent: string | null; primaryHost: string | null };
  stations: { id: string; code: string; name: string; kind: 'kitchen' | 'bar'; assigned: boolean }[];
  orderingMode: string;
};

export function workspaces(me: StaffMe): { href: string; label: string; icon: IconName }[] {
  const r = (x: string) => me.roles.includes(x) || me.roles.includes('admin');
  const base = `/r/${me.restaurant.slug}`;
  const out: { href: string; label: string; icon: IconName }[] = [];
  if (r('floor')) out.push({ href: `${base}/op/salao`, label: 'Salão', icon: 'users' });
  if (me.stations.some((st) => st.kind === 'kitchen')) out.push({ href: `${base}/op/cozinha`, label: 'Cozinha', icon: 'flame' });
  if (me.stations.some((st) => st.kind === 'bar')) out.push({ href: `${base}/op/bar`, label: 'Bar', icon: 'glass' });
  if (r('cashier')) out.push({ href: `${base}/op/caixa`, label: 'Caixa', icon: 'receipt' });
  if (me.roles.includes('admin')) out.push({ href: `${base}/admin`, label: 'Administração', icon: 'settings' });
  return out;
}

export function StaffShell({ me, children }: { me: StaffMe; children: ReactNode }) {
  const pathname = usePathname() ?? '';
  const tabs = workspaces(me);
  const roles = me.isOwner ? ['owner', ...me.roles.filter((x) => x !== 'admin' && x !== 'owner')] : me.roles.filter((x) => x !== 'owner');
  return (
    <QueryProvider>
      <StaffRealtime restaurantId={me.restaurantId} memberId={me.memberId} slug={me.restaurant.slug}>
        <div className={s.app} style={{ '--tenant-accent': me.restaurant.accent ?? '#6f3038' } as CSSProperties}>
          <a className="skip-link" href="#conteudo">Saltar para o conteúdo</a>
          <header className={s.top}>
            <div className={s.topInner}>
              <Link href="/restaurantes" className={s.tenant} title="Trocar de restaurante">{me.restaurant.name}</Link>
              <nav className={s.tabs} aria-label="Áreas de trabalho">
                {tabs.map((t) => (
                  <Link key={t.href} href={t.href} className={s.tab} aria-current={pathname.startsWith(t.href) ? 'page' : undefined}>
                    <Icon name={t.icon} size={18} />{t.label}
                  </Link>
                ))}
              </nav>
              <details className={s.userMenu}>
                <summary className={s.userBtn} aria-label="Conta"><Icon name="user" size={18} /><span className={s.mobileHidden}>{me.displayName}</span></summary>
                <div className={s.userPanel}>
                  <p style={{ padding: '6px 10px', fontSize: '0.85rem', color: 'var(--n-600)' }}>
                    {me.displayName}<br />{roles.map((x) => ROLE_LABEL[x]).join(' · ')}
                  </p>
                  <Link href="/restaurantes"><Icon name="store" size={18} />Trocar de restaurante</Link>
                  <form method="post" action="/auth/logout"><button type="submit"><Icon name="logout" size={18} />Terminar sessão</button></form>
                </div>
              </details>
            </div>
          </header>
          <div id="conteudo" style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>{children}</div>
        </div>
      </StaffRealtime>
    </QueryProvider>
  );
}
