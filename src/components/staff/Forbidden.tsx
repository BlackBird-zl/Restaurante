import Link from 'next/link';

/** 403 view: hiding a button is never the authorization — the API/RPC also refuse. */
export function Forbidden({ slug }: { slug: string }) {
  return (
    <main style={{ padding: '48px 20px', display: 'grid', gap: 12, justifyItems: 'start', maxWidth: 560, margin: '0 auto' }}>
      <p style={{ letterSpacing: '0.2em', fontSize: '0.8rem', fontWeight: 700, color: 'var(--n-600)' }}>403</p>
      <h1 style={{ fontSize: '1.6rem', fontWeight: 700 }}>Sem permissão para esta área</h1>
      <p style={{ color: 'var(--n-600)' }}>A sua função neste restaurante não inclui esta área. Se precisar de acesso, fale com a administração.</p>
      <Link href={`/r/${slug}`} style={{ fontWeight: 600 }}>Ir para a minha área</Link>
    </main>
  );
}
