'use client';
import { useState, type FormEvent } from 'react';
import { WEEKDAYS, type WeeklyHours } from '@/lib/time';
import { Button, Field, Notice } from '@/components/ui/primitives';
import { useAdminAction } from './useAdmin';
import s from '../staff.module.css';

type Settings = {
  orderingMode: 'open' | 'paused' | 'closed'; maxItemsPerOrder: number; maxUnitsPerOrder: number; maxOrderCents: number; version: number;
  publicContacts: Record<string, string | null>; weeklyHours: WeeklyHours; isOwner: boolean;
  restaurant: { name: string; slug: string; timezone: string; isDemo: boolean; businessDayStart: string };
  domains: { hostname: string; kind: string; status: string; isPrimary: boolean }[];
};

export function SettingsForm({ settings }: { settings: Settings }) {
  const { act, pending, feedback } = useAdminAction();
  const [hours, setHours] = useState<WeeklyHours>(settings.weeklyHours);

  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const c = (k: string) => { const v = String(fd.get(k) ?? '').trim(); return v ? v : null; };
    await act('save', '/settings', {
      version: settings.version,
      patch: {
        restaurantName: String(fd.get('name')).trim(),
        weeklyHours: hours,
        publicContacts: { phone: c('phone'), email: c('email'), addressLine: c('addressLine'), city: c('city'), mapUrl: c('mapUrl'), instagram: c('instagram') },
      },
    }, { method: 'PATCH', ok: 'Configurações guardadas.' });
  }
  function setWindow(day: keyof WeeklyHours, idx: number, part: 0 | 1, value: string) {
    setHours((h) => {
      const list = [...(h[day] ?? [])].map((w) => [...w] as [string, string]);
      list[idx]![part] = value;
      return { ...h, [day]: list };
    });
  }
  return (
    <div style={{ display: 'grid', gap: 16, maxWidth: 900 }}>
      <div className={s.pageHead}><div><h1 className={s.h1}>Configurações</h1><p className={s.sub}>{settings.restaurant.slug} · {settings.restaurant.timezone} · dia operacional começa às {settings.restaurant.businessDayStart}</p></div></div>
      {feedback ? <Notice tone={feedback.tone === 'info' ? 'info' : feedback.tone}>{feedback.text}</Notice> : null}
      <section className={s.card}>
        <h2 className={s.h2}>Serviço de pedidos à mesa</h2>
        <p className={s.sub}>Pausar novos pedidos não remove pedidos em curso nem impede pedir ajuda ou a conta.</p>
        <div className={s.actions}>
          {(['open', 'paused', 'closed'] as const).map((m) => (
            <Button key={m} variant={settings.orderingMode === m ? 'primary' : 'secondary'} size="lg" loading={pending === `m-${m}`}
              aria-pressed={settings.orderingMode === m}
              onClick={() => void act(`m-${m}`, '/ordering-mode', { mode: m }, { ok: `Pedidos ${m === 'open' ? 'abertos' : m === 'paused' ? 'pausados' : 'fechados'}.` })}>
              {m === 'open' ? 'Aberto' : m === 'paused' ? 'Pausado' : 'Fechado'}
            </Button>
          ))}
        </div>
        <p className={s.sub}>Limites por pedido: {settings.maxItemsPerOrder} linhas, {settings.maxUnitsPerOrder} unidades, {(settings.maxOrderCents / 100).toFixed(0)} €. Configuráveis apenas pelo operador do sistema.</p>
      </section>
      <form onSubmit={save} style={{ display: 'grid', gap: 16 }}>
        <section className={s.card}>
          <h2 className={s.h2}>Identidade e contactos públicos</h2>
          <Field label="Nome público">{(p) => <input {...p} name="name" defaultValue={settings.restaurant.name} maxLength={80} required />}</Field>
          <div className={`${s.formGrid} ${s.formGrid2}`}>
            <Field label="Telefone" hint="Só aparece no site se preenchido e verificado.">{(p) => <input {...p} name="phone" defaultValue={settings.publicContacts.phone ?? ''} maxLength={30} />}</Field>
            <Field label="Email">{(p) => <input {...p} name="email" type="email" defaultValue={settings.publicContacts.email ?? ''} maxLength={160} />}</Field>
            <Field label="Morada">{(p) => <input {...p} name="addressLine" defaultValue={settings.publicContacts.addressLine ?? ''} maxLength={120} />}</Field>
            <Field label="Cidade / linha de localização">{(p) => <input {...p} name="city" defaultValue={settings.publicContacts.city ?? ''} maxLength={80} />}</Field>
            <Field label="Link de mapa (https)">{(p) => <input {...p} name="mapUrl" type="url" defaultValue={settings.publicContacts.mapUrl ?? ''} />}</Field>
            <Field label="Instagram">{(p) => <input {...p} name="instagram" defaultValue={settings.publicContacts.instagram ?? ''} maxLength={60} />}</Field>
          </div>
        </section>
        <section className={s.card}>
          <h2 className={s.h2}>Horário publicado</h2>
          <p className={s.sub}>Informativo e usado nas horas indicativas de reserva. Não fecha contas automaticamente.</p>
          {WEEKDAYS.map((d) => (
            <div key={d.key} className={s.row} style={{ flexWrap: 'wrap' }}>
              <strong style={{ minWidth: 120 }}>{d.label}</strong>
              <div className={s.toolbar}>
                {(hours[d.key] ?? []).map((w, i) => (
                  <span key={i} className={s.toolbar}>
                    <input type="time" value={w[0]} onChange={(e) => setWindow(d.key, i, 0, e.target.value)} aria-label={`${d.label} abertura ${i + 1}`} style={{ minHeight: 40 }} />–
                    <input type="time" value={w[1]} onChange={(e) => setWindow(d.key, i, 1, e.target.value)} aria-label={`${d.label} fecho ${i + 1}`} style={{ minHeight: 40 }} />
                    <Button type="button" variant="ghost" aria-label="Remover período" onClick={() => setHours((h) => ({ ...h, [d.key]: (h[d.key] ?? []).filter((_, j) => j !== i) }))}>×</Button>
                  </span>
                ))}
                {(hours[d.key] ?? []).length === 0 ? <span className={s.muted}>Encerrado</span> : null}
                {(hours[d.key] ?? []).length < 3 ? <Button type="button" variant="ghost" onClick={() => setHours((h) => ({ ...h, [d.key]: [...(h[d.key] ?? []), ['12:00', '15:00']] }))}>+ período</Button> : null}
              </div>
            </div>
          ))}
        </section>
        <div><Button type="submit" variant="primary" size="lg" loading={pending === 'save'}>Guardar configurações</Button></div>
      </form>
      <section className={s.card}>
        <h2 className={s.h2}>Domínios</h2>
        {settings.domains.map((d) => <div key={d.hostname} className={s.row}><span>{d.hostname}{d.isPrimary ? ' (primário)' : ''}</span><span className={s.pill}>{d.kind === 'platform' ? 'plataforma' : 'próprio'} · {d.status}</span></div>)}
        <p className={s.sub}>Domínios próprios são verificados pelo operador (DNS + alojamento) antes de ficarem ativos — ver docs/OPERATIONS.md.</p>
      </section>
      <section className={s.card}>
        <h2 className={s.h2}>Segurança</h2>
        <p className={s.sub}>Titularidade: {settings.isOwner ? 'é o proprietário deste restaurante.' : 'apenas o proprietário transfere a titularidade (Equipa).'} O acesso de membros suspensos termina no pedido seguinte. As sessões de mesa terminam ao fechar cada conta.</p>
      </section>
    </div>
  );
}
