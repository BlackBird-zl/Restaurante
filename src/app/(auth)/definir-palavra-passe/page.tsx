import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getStaffClaims } from '@/lib/supabase/server';
import { btnClass, Notice } from '@/components/ui/basic';
import ui from '@/components/ui/ui.module.css';
import s from '../auth.module.css';

export const metadata: Metadata = { title: 'Definir palavra-passe', robots: { index: false, follow: false } };

const ERR: Record<string, string> = { curta: 'Use pelo menos 10 caracteres.', diferente: 'As palavras-passe não coincidem.', fraca: 'Palavra-passe recusada. Escolha outra.', sessao: 'Sessão inválida.' };

export default async function SetPasswordPage({ searchParams }: { searchParams: Promise<{ erro?: string }> }) {
  const sp = await searchParams;
  const claims = await getStaffClaims();
  if (!claims) redirect('/entrar?erro=link');
  return (
    <main className={s.page}>
      <form className={s.card} method="post" action="/auth/set-password">
        <h1 className={s.title}>Definir palavra-passe</h1>
        <p className={s.muted}>Conta: {claims.email}</p>
        {sp.erro && ERR[sp.erro] ? <Notice tone="danger">{ERR[sp.erro]}</Notice> : null}
        <div className={ui.field}>
          <label className={ui.label} htmlFor="password">Nova palavra-passe</label>
          <input className={ui.input} id="password" name="password" type="password" autoComplete="new-password" minLength={10} required />
          <p className={ui.hint}>Mínimo 10 caracteres.</p>
        </div>
        <div className={ui.field}>
          <label className={ui.label} htmlFor="confirm">Repetir</label>
          <input className={ui.input} id="confirm" name="confirm" type="password" autoComplete="new-password" minLength={10} required />
        </div>
        <button className={btnClass('primary', 'lg', true)} type="submit">Guardar</button>
      </form>
    </main>
  );
}
