'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Icon, type IconName } from '@/components/ui/Icon';
import s from '../staff.module.css';

const GROUPS: { title: string; items: { href: string; label: string; icon: IconName }[] }[] = [
  { title: 'Serviço', items: [
    { href: '', label: 'Resumo', icon: 'chart' },
    { href: '/pedidos', label: 'Pedidos', icon: 'list' },
    { href: '/chamados', label: 'Chamados', icon: 'bell' },
    { href: '/contas', label: 'Contas', icon: 'receipt' },
    { href: '/reservas', label: 'Reservas', icon: 'calendar' },
  ] },
  { title: 'Carta', items: [
    { href: '/carta/produtos', label: 'Produtos', icon: 'utensils' },
    { href: '/carta/categorias', label: 'Categorias', icon: 'list' },
  ] },
  { title: 'Espaço e equipa', items: [
    { href: '/mesas', label: 'Mesas e QR', icon: 'qr' },
    { href: '/estacoes', label: 'Estações', icon: 'flame' },
    { href: '/equipa', label: 'Equipa', icon: 'users' },
  ] },
  { title: 'Marca e negócio', items: [
    { href: '/site', label: 'Site e marca', icon: 'image' },
    { href: '/analytics', label: 'Analytics', icon: 'chart' },
    { href: '/configuracoes', label: 'Configurações', icon: 'settings' },
  ] },
];

export function AdminNav({ slug, mobile = false }: { slug: string; mobile?: boolean }) {
  const pathname = usePathname() ?? '';
  const base = `/r/${slug}/admin`;
  const active = (href: string) => (href === '' ? pathname === base : pathname.startsWith(base + href));
  if (mobile) {
    return (
      <nav className={s.adminMobileNav} aria-label="Administração">
        {GROUPS.flatMap((g) => g.items).map((i) => (
          <Link key={i.href} href={base + i.href} aria-current={active(i.href) ? 'page' : undefined}>{i.label}</Link>
        ))}
      </nav>
    );
  }
  return (
    <nav className={s.side} aria-label="Administração">
      {GROUPS.map((g) => (
        <div key={g.title}>
          <p className={s.sideGroup}>{g.title}</p>
          {g.items.map((i) => (
            <Link key={i.href} href={base + i.href} className={s.sideLink} aria-current={active(i.href) ? 'page' : undefined}>
              <Icon name={i.icon} size={18} />{i.label}
            </Link>
          ))}
        </div>
      ))}
    </nav>
  );
}
