'use client';
import { useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';
import { ApiClientError } from '@/lib/http/client';
import { useStaffAction } from '../useStaff';

export type Feedback = { tone: 'ok' | 'danger' | 'warn' | 'info'; text: string } | null;

/** Admin mutation → server-rendered data refresh. Conflicts are shown, never silently overwritten. */
export function useAdminAction() {
  const router = useRouter();
  const { run, pending } = useStaffAction();
  const [feedback, setFeedback] = useState<Feedback>(null);
  const act = useCallback(async <T,>(id: string, path: string, body: unknown, opts: { method?: 'POST' | 'PATCH' | 'DELETE'; ok?: string } = {}) => {
    setFeedback(null);
    const r = await run<T>(id, path, body, opts.method ?? 'POST');
    if (r.ok) {
      if (opts.ok) setFeedback({ tone: 'ok', text: opts.ok });
      router.refresh();
    } else {
      const e = r.error;
      let text = r.message;
      if (e instanceof ApiClientError) {
        const d = e.details as { field?: string; reason?: string; problems?: { field?: string; pair?: string; ratio?: number; min?: number }[]; activeLines?: number; products?: number } | undefined;
        if (e.code === 'VERSION_CONFLICT') text = 'Outra pessoa alterou este registo entretanto. A página foi atualizada; reveja e guarde de novo.';
        if (e.code === 'FIELD_CONFLICT') text = `Já existe um registo com esse ${d?.field === 'slug' ? 'endereço (slug)' : d?.field === 'label' ? 'rótulo' : d?.field === 'code' ? 'código' : d?.field ?? 'valor'}.`;
        if (e.code === 'DEPENDENCY') text = `Não é possível: ${d?.activeLines ? `${d.activeLines} linha(s) em curso` : ''}${d?.products ? ` ${d.products} produto(s) associados` : ''}${d?.reason ? ` (${d.reason.replace(/_/g, ' ')})` : ''}.`;
        if (e.code === 'INVALID_INPUT' && d?.problems?.length) {
          text = `Verifique: ${d.problems.map((p) => (p.pair ? `contraste ${p.pair} ${p.ratio ?? ''} (mín. ${p.min})` : p.field)).join('; ')}.`;
        } else if (e.code === 'INVALID_INPUT' && d?.field) text = `Campo inválido: ${d.field}${d.reason ? ` (${d.reason.replace(/_/g, ' ')})` : ''}.`;
        if (e.code === 'VERSION_CONFLICT') router.refresh();
      }
      setFeedback({ tone: 'danger', text });
    }
    return r;
  }, [run, router]);
  return { act, pending, feedback, setFeedback };
}
