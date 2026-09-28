import type { Metadata } from 'next';
import Link from 'next/link';
import { btnClass, Notice } from '@/components/ui/basic';
import ui from '@/components/ui/ui.module.css';
import s from '../auth.module.css';

export const metadata: Metadata = { title: 'Recuperar acesso', robots: { index: false, follow: false } };

export default async function RecoverPage({ searchParams }: { searchParams: Promise<{ enviado?: string }> }) {
  const sp = await searchParams;
  return (
    <main className={s.page}>
      <form className={s.card} method="post" action="/auth/recover">
        <h1 className={s.title}>Recuperar acesso</h1>
        {sp.enviado ? (
          <Notice tone="ok">Se existir uma conta com esse email, foi pedido o envio de instruções. Verifique a caixa de correio (e o spam).</Notice>
        ) : <p className={s.muted}>Indique o email da sua conta de equipa.</p>}
        <div className={ui.field}>
          <label className={ui.label} htmlFor="email">Email</label>
          <input className={ui.input} id="email" name="email" type="email" autoComplete="username" required maxLength={160} />
        </div>
        <button className={btnClass('primary', 'lg', true)} type="submit">Enviar instruções</button>
        <div className={s.links}><Link href="/entrar">Voltar a entrar</Link></div>
      </form>
    </main>
  );
}
