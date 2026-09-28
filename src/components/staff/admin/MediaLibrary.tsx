'use client';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { ApiClientError, errorMessage, newIdempotencyKey } from '@/lib/http/client';
import { mediaKeyUrl } from '@/modules/media/url';
import { Button, Field, Notice, inputClass } from '@/components/ui/primitives';
import { useStaffRT } from '../StaffRealtime';
import { useAdminAction } from './useAdmin';
import type { AdminMedia } from './menu-types';
import s from '../staff.module.css';

function thumb(m: AdminMedia) {
  const v = (m.variants ?? []).find((x) => x.role === 'card') ?? (m.variants ?? [])[0];
  return mediaKeyUrl(v?.key ?? m.key);
}

/** Upload (validated & re-encoded on the server), alt text, approval and archive. Originals never public. */
export function MediaLibrary({ media }: { media: AdminMedia[] }) {
  const rt = useStaffRT();
  const router = useRouter();
  const { act, pending, feedback } = useAdminAction();
  const [upload, setUpload] = useState<{ tone: 'ok' | 'danger'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function onUpload(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const file = fd.get('file');
    if (!(file instanceof File) || file.size === 0) { setUpload({ tone: 'danger', text: 'Escolha um ficheiro JPEG, PNG, WebP ou AVIF.' }); return; }
    if (file.size > 10 * 1024 * 1024) { setUpload({ tone: 'danger', text: 'O ficheiro excede 10 MB.' }); return; }
    setBusy(true);
    setUpload(null);
    try {
      const res = await fetch(`/api/v1/staff/r/${rt.slug}/media`, { method: 'POST', body: fd, headers: { 'Idempotency-Key': newIdempotencyKey() } });
      const j = await res.json().catch(() => null);
      if (!res.ok) throw new ApiClientError(j?.error?.code ?? 'INTERNAL', res.status, j?.error?.details);
      setUpload({ tone: 'ok', text: 'Imagem carregada e convertida. Reveja o texto alternativo e aprove-a para poder publicá-la.' });
      form.reset();
      router.refresh();
    } catch (err) {
      const reason = err instanceof ApiClientError ? (err.details as { reason?: string } | undefined)?.reason : undefined;
      setUpload({ tone: 'danger', text: reason ? `Ficheiro recusado: ${reason.replace(/_/g, ' ')}.` : errorMessage(err) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      {feedback ? <Notice tone={feedback.tone === 'info' ? 'info' : feedback.tone}>{feedback.text}</Notice> : null}
      <form className={s.card} onSubmit={onUpload} style={{ maxWidth: 720 }}>
        <h2 className={s.h2}>Carregar imagem</h2>
        <p className={s.sub}>JPEG, PNG, WebP ou AVIF até 10 MB. O servidor verifica a assinatura do ficheiro, remove metadados (EXIF) e gera variantes WebP/JPEG. SVG e ficheiros executáveis são recusados.</p>
        <div className={`${s.formGrid} ${s.formGrid2}`}>
          <Field label="Ficheiro">{(p) => <input {...p} name="file" type="file" accept="image/jpeg,image/png,image/webp,image/avif" required />}</Field>
          <Field label="Uso">{(p) => <select {...p} name="purpose"><option value="product">Produto</option><option value="hero">Hero</option><option value="ambience">Ambiente</option><option value="editorial">Editorial</option></select>}</Field>
        </div>
        <Field label="Texto alternativo" hint="Descreva a comida ou o espaço (até 160 caracteres).">{(p) => <input {...p} name="alt" maxLength={160} required />}</Field>
        {upload ? <Notice tone={upload.tone}>{upload.text}</Notice> : null}
        <div><Button type="submit" variant="primary" loading={busy}>Carregar</Button></div>
      </form>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
        {media.map((m) => (
          <article key={m.id} className={s.card} style={{ gap: 8 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={thumb(m)} alt={m.alt} width={m.width} height={m.height} loading="lazy" style={{ width: '100%', height: 150, objectFit: 'cover', borderRadius: 8, background: 'var(--n-100)' }} />
            <div className={s.meta}>
              <span className={s.pill}>{m.purpose}</span>
              {m.sourceType === 'placeholder' ? <span className={s.pill}>placeholder · foto pendente</span> : <span className={s.pill}>{m.sourceType}</span>}
              <span className={s.pill}>{m.approved ? 'aprovada' : 'por aprovar'}</span>
            </div>
            <input className={inputClass} defaultValue={m.alt} maxLength={160} aria-label="Texto alternativo" style={{ minHeight: 40 }}
              onBlur={(e) => { if (e.target.value !== m.alt) void act(`alt-${m.id}`, `/media/${m.id}`, { alt: e.target.value }, { method: 'PATCH', ok: 'Texto alternativo guardado.' }); }} />
            <div className={s.actions}>
              <Button size="md" variant={m.approved ? 'secondary' : 'primary'} loading={pending === `ap-${m.id}`}
                onClick={() => void act(`ap-${m.id}`, `/media/${m.id}`, { approved: !m.approved }, { method: 'PATCH', ok: m.approved ? 'Aprovação retirada.' : 'Imagem aprovada.' })}>{m.approved ? 'Retirar aprovação' : 'Aprovar'}</Button>
              <Button size="md" variant="ghost" loading={pending === `ar-${m.id}`}
                onClick={() => void act(`ar-${m.id}`, `/media/${m.id}`, { archived: true }, { method: 'PATCH', ok: 'Imagem arquivada.' })}>Arquivar</Button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
