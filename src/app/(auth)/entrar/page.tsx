import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getStaffClaims } from '@/lib/supabase/server';
import { safeNext } from '@/modules/auth/redirects';
import { btnClass, Notice } from '@/components/ui/basic';
import ui from '@/components/ui/ui.module.css';
import s from '../auth.module.css';

export const metadata: Metadata = { title: 'Entrar', robots: { index: false, follow: false } };

const ERRORS: Record<string, string> = {
  credenciais: 'Email ou palavra-passe incorretos.',
  sessao: 'A sessão terminou. Entre de novo.',
  limite: 'Demasiadas tentativas. Aguarde um pouco.',
  link: 'O link é inválido ou expirou. Peça um novo.',
};

/** Email + password only (no public sign-up). Works without JavaScript (form POST). */
export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; erro?: string; saiu?: string; ok?: string }> }) {
  const sp = await searchParams;
  const next = safeNext(sp.next);
  if (await getStaffClaims()) redirect(next);
  return (
    <main className={s.page}>
      <form className={s.card} method="post" action="/auth/login">
        <p className={s.brand}>Equipa · acesso reservado</p>
        <h1 className={s.title}>Entrar</h1>
        {sp.erro && ERRORS[sp.erro] ? <Notice tone="danger">{ERRORS[sp.erro]}</Notice> : null}
        {sp.saiu ? <Notice tone="ok">Sessão terminada neste dispositivo.</Notice> : null}
        {sp.ok === 'palavra-passe' ? <Notice tone="ok">Palavra-passe definida. Entre com a nova palavra-passe.</Notice> : null}
        <input type="hidden" name="next" value={next} />
        <div className={ui.field}>
          <label className={ui.label} htmlFor="email">Email</label>
          <input className={ui.input} id="email" name="email" type="email" autoComplete="username" required maxLength={160} />
        </div>
        <div className={ui.field}>
          <label className={ui.label} htmlFor="password">Palavra-passe</label>
          <input className={ui.input} id="password" name="password" type="password" autoComplete="current-password" required maxLength={200} />
        </div>
        <button className={btnClass('primary', 'lg', true)} type="submit">Entrar</button>
        <div className={s.links}>
          <Link href="/recuperar">Esqueci-me da palavra-passe</Link>
        </div>
        <p className={s.muted}>Não existe registo público. O acesso é criado por convite do restaurante.</p>
      </form>
    </main>
  );
}
