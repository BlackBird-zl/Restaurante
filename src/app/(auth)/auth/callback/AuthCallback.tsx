'use client';
import { useEffect, useState } from 'react';
import { browserClient } from '@/lib/supabase/browser';
import { safeNext } from '@/modules/auth/redirects';
import s from '../../auth.module.css';

/**
 * Handles the three Auth link styles: PKCE `?code=`, `?token_hash=&type=` and implicit `#access_token`
 * (invitations from the Admin API). Tokens never stay in the URL/history.
 */
export function AuthCallback() {
  const [error, setError] = useState(false);
  useEffect(() => {
    const url = new URL(window.location.href);
    const next = safeNext(url.searchParams.get('next'));
    const hash = new URLSearchParams(url.hash.slice(1));
    window.history.replaceState(null, '', url.pathname);
    (async () => {
      try {
        if (hash.get('access_token') && hash.get('refresh_token')) {
          const { error: e } = await browserClient().auth.setSession({ access_token: hash.get('access_token')!, refresh_token: hash.get('refresh_token')! });
          if (e) throw e;
        } else if (url.searchParams.get('code') || url.searchParams.get('token_hash')) {
          const body = url.searchParams.get('code')
            ? { code: url.searchParams.get('code') }
            : { tokenHash: url.searchParams.get('token_hash'), type: url.searchParams.get('type') ?? 'email' };
          const r = await fetch('/auth/exchange', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
          if (!r.ok) throw new Error('exchange');
        } else throw new Error('nothing');
        window.location.replace(next);
      } catch {
        setError(true);
      }
    })();
  }, []);
  return (
    <main className={s.page}>
      <div className={s.card} role="status" aria-live="polite">
        <h1 className={s.title}>{error ? 'Link inválido ou expirado' : 'A validar o acesso…'}</h1>
        {error ? <p className={s.muted}>Peça um novo convite ou use “Esqueci-me da palavra-passe”. <a href="/entrar">Voltar a entrar</a></p> : null}
      </div>
    </main>
  );
}
