import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getStaffClaims, staffClient } from '@/lib/supabase/server';
import { ROLE_LABEL } from '@/modules/orders/status';
import { btnClass, Notice } from '@/components/ui/basic';
import s from '../auth.module.css';

export const metadata: Metadata = { title: 'Restaurantes', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

type Memberships = {
  memberships: { slug: string; name: string; displayName: string; isOwner: boolean; roles: string[] }[];
  invitations: { memberId: string; restaurantName: string; slug: string; displayName: string }[];
};

export default async function RestaurantsPage({ searchParams }: { searchParams: Promise<{ ok?: string; erro?: string }> }) {
  const sp = await searchParams;
  const client = await staffClient();
  const claims = await getStaffClaims(client);
  if (!claims) redirect('/entrar?next=/restaurantes');
  const { data } = await client.rpc('staff_list_memberships');
  const m = (data ?? { memberships: [], invitations: [] }) as Memberships;
  if (m.memberships.length === 1 && !m.invitations.length && !sp.ok) redirect(`/r/${m.memberships[0]!.slug}`);
  return (
    <main className={s.page}>
      <div className={s.card}>
        <p className={s.brand}>Equipa</p>
        <h1 className={s.title}>Os seus restaurantes</h1>
        <p className={s.muted}>{claims.email}</p>
        {sp.ok === 'palavra-passe' ? <Notice tone="ok">Palavra-passe guardada.</Notice> : null}
        {sp.erro === 'convite' ? <Notice tone="danger">Não foi possível aceitar o convite.</Notice> : null}
        {m.invitations.length ? (
          <div className={s.list}>
            {m.invitations.map((i) => (
              <form key={i.memberId} method="post" action="/auth/accept-invitation" className={s.tenant}>
                <input type="hidden" name="memberId" value={i.memberId} />
                <span><strong>{i.restaurantName}</strong><br /><span className={s.roles}>Convite pendente para {i.displayName}</span></span>
                <button className={btnClass('primary')} type="submit">Aceitar</button>
              </form>
            ))}
          </div>
        ) : null}
        <nav className={s.list} aria-label="Restaurantes">
          {m.memberships.map((r) => (
            <Link key={r.slug} href={`/r/${r.slug}`} className={s.tenant}>
              <span><strong>{r.name}</strong><br />
                <span className={s.roles}>{[r.isOwner ? 'Proprietário' : null, ...r.roles.filter((x) => !(r.isOwner && x === 'admin')).map((x) => ROLE_LABEL[x])].filter(Boolean).join(' · ')}</span>
              </span>
              <span aria-hidden>→</span>
            </Link>
          ))}
          {!m.memberships.length ? <p className={s.muted}>Ainda não pertence a nenhum restaurante ativo.</p> : null}
        </nav>
        <form method="post" action="/auth/logout"><button className={btnClass('secondary', 'md', true)} type="submit">Terminar sessão</button></form>
      </div>
    </main>
  );
}
