'use client';
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { api, ApiClientError, errorMessage, newIdempotencyKey } from '@/lib/http/client';
import { localToday, reservationSlots, type WeeklyHours } from '@/lib/time';
import { Field, Notice } from '@/components/ui/primitives';
import s from './public.module.css';

const FIELD_MSG: Record<string, string> = {
  name: 'Indique um nome com pelo menos 2 caracteres.',
  email: 'Email inválido.',
  phone: 'Telefone inválido.',
  contact: 'Indique um email ou um telefone.',
  date: 'Escolha uma data válida (com pelo menos duas horas de antecedência e até 90 dias).',
  time: 'Escolha uma hora dentro do horário publicado.',
  partySize: 'Entre 1 e 12 pessoas.',
};

function addDays(ymd: string, n: number) {
  const d = new Date(`${ymd}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function ReservationForm({ basePath, weeklyHours, demoNotice }: { basePath: string; weeklyHours: WeeklyHours; demoNotice?: string }) {
  const today = useMemo(() => localToday(), []);
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [pending, setPending] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [done, setDone] = useState<{ reference: string } | null>(null);
  const keyRef = useRef<string | null>(null);
  const startedAt = useRef(0);
  useEffect(() => { startedAt.current = Date.now(); }, []);
  const slots = date ? reservationSlots(weeklyHours, date) : [];

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pending) return;
    const fd = new FormData(e.currentTarget);
    const body = {
      name: String(fd.get('name') ?? '').trim(), email: String(fd.get('email') ?? '').trim() || undefined,
      phone: String(fd.get('phone') ?? '').trim() || undefined, date, time,
      partySize: Number(fd.get('partySize')), note: String(fd.get('note') ?? '').trim() || undefined,
      website: String(fd.get('website') ?? ''), elapsedMs: Date.now() - startedAt.current,
    };
    const errs: Record<string, string> = {};
    if (body.name.length < 2) errs.name = FIELD_MSG.name!;
    if (!body.email && !body.phone) errs.contact = FIELD_MSG.contact!;
    if (!date) errs.date = FIELD_MSG.date!;
    if (!time) errs.time = FIELD_MSG.time!;
    setErrors(errs);
    if (Object.keys(errs).length) return;
    // Key created at the start of the submission and preserved for retries of the same payload.
    keyRef.current ??= newIdempotencyKey();
    setPending(true);
    setFormError(null);
    try {
      const { data } = await api<{ reservation: { reference: string } }>(`${basePath}/api/v1/public/reservations`, {
        body, idempotencyKey: keyRef.current,
      });
      setDone({ reference: data.reservation.reference });
    } catch (err) {
      if (err instanceof ApiClientError && err.code === 'INVALID_INPUT') {
        const d = err.details as { field?: string; fieldErrors?: Record<string, string> } | undefined;
        const field = d?.field ?? Object.keys(d?.fieldErrors ?? {})[0] ?? '';
        setErrors({ [field]: FIELD_MSG[field] ?? 'Verifique este campo.' });
        keyRef.current = null;
      } else {
        if (!(err instanceof ApiClientError && err.outcomeUnknown)) keyRef.current = null;
        setFormError(errorMessage(err));
      }
    } finally {
      setPending(false);
    }
  }

  if (done) {
    return (
      <div className={s.confirmation} role="status" aria-live="polite">
        <p className={s.eyebrow}>Pedido recebido</p>
        <p className={s.h3}>A reserva depende de confirmação da equipa.</p>
        <p>Referência do pedido: <span className={s.reference}>{done.reference}</span></p>
        <p className={s.muted}>Guarde a referência. Não é enviada qualquer mensagem automática.</p>
      </div>
    );
  }

  return (
    <form className={s.formGrid} onSubmit={onSubmit} noValidate>
      {demoNotice ? <p className={s.demoNotice}>{demoNotice}</p> : null}
      <div className={`${s.formRow} ${s.formRow3}`}>
        <Field label="Data" error={errors.date}>
          {(p) => <input {...p} type="date" name="date" required min={today} max={addDays(today, 90)} value={date}
            onChange={(e) => { setDate(e.target.value); setTime(''); }} />}
        </Field>
        <Field label="Hora" error={errors.time} hint={date && !slots.length ? 'Encerrado neste dia.' : undefined}>
          {(p) => (
            <select {...p} name="time" required value={time} onChange={(e) => setTime(e.target.value)} disabled={!slots.length}>
              <option value="">{date ? (slots.length ? 'Escolher' : '—') : 'Escolha a data'}</option>
              {slots.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          )}
        </Field>
        <Field label="Pessoas" error={errors.partySize}>
          {(p) => (
            <select {...p} name="partySize" defaultValue="2">
              {Array.from({ length: 12 }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1}</option>)}
            </select>
          )}
        </Field>
      </div>
      <Field label="Nome" error={errors.name}>{(p) => <input {...p} name="name" autoComplete="name" maxLength={80} required />}</Field>
      <div className={s.formRow}>
        <Field label="Email" error={errors.email ?? errors.contact} hint="Indique email ou telefone.">
          {(p) => <input {...p} name="email" type="email" autoComplete="email" maxLength={160} />}
        </Field>
        <Field label="Telefone" error={errors.phone}>{(p) => <input {...p} name="phone" type="tel" autoComplete="tel" maxLength={20} />}</Field>
      </div>
      <Field label="Nota (opcional)" hint="Até 300 caracteres.">{(p) => <textarea {...p} name="note" maxLength={300} />}</Field>
      <div className={s.honeypot} aria-hidden>
        <label htmlFor="website">Website</label><input id="website" name="website" tabIndex={-1} autoComplete="off" />
      </div>
      {formError ? <Notice tone="danger">{formError}</Notice> : null}
      <div>
        <button className={s.ctaPrimary} type="submit" disabled={pending} aria-busy={pending}>
          {pending ? 'A enviar…' : 'Enviar pedido de reserva'}
        </button>
      </div>
      <p className={s.muted} style={{ fontSize: '0.9rem' }}>Enviar este pedido não garante lugar. A equipa confirma por contacto direto.</p>
    </form>
  );
}
