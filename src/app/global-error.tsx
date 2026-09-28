'use client';

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="pt-PT">
      <body style={{ fontFamily: 'system-ui, sans-serif', padding: 32 }}>
        <h1>Ocorreu um erro inesperado</h1>
        <p>Nada foi registado como concluído. Tente novamente.</p>
        <button type="button" onClick={() => reset()} style={{ minHeight: 48, padding: '0 18px', marginTop: 16 }}>Tentar de novo</button>
      </body>
    </html>
  );
}
