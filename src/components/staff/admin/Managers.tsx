'use client';
import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import { formatDateTime } from '@/lib/time';
import { ROLE_LABEL, VISIT_STATE } from '@/modules/orders/status';
import { Button, ConfirmDialog, Field, Notice, inputClass } from '@/components/ui/primitives';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useAdminAction, type Feedback } from './useAdmin';
import type { AdminCategory } from './menu-types';
import s from '../staff.module.css';

function FeedbackNotice({ f }: { f: Feedback }) {
  return f ? <Notice tone={f.tone === 'info' ? 'info' : f.tone}>{f.text}</Notice> : null;
}

/* ------------------------------------ Categories ------------------------------------ */
export function CategoryManager({ categories }: { categories: AdminCategory[] }) {
  const { act, pending, feedback } = useAdminAction();
  const [edit, setEdit] = useState<string | null>(null);
  const sorted = [...categories].sort((a, b) => a.sortOrder - b.sortOrder);
  async function move(c: AdminCategory, dir: -1 | 1) {
    const idx = sorted.indexOf(c);
    const other = sorted[idx + dir];
    if (!other) return;
    await act(`mv-${c.id}`, `/categories/${c.id}`, { version: c.version, fields: { sortOrder: other.sortOrder } }, { method: 'PATCH' });
    await act(`mv2-${other.id}`, `/categories/${other.id}`, { version: other.version, fields: { sortOrder: c.sortOrder } }, { method: 'PATCH', ok: 'Ordem atualizada.' });
  }
  async function create(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const name = String(fd.get('name'));
    const r = await act('create', '/categories', {
      name, slug: name.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
      description: String(fd.get('description') ?? ''), sortOrder: (sorted.at(-1)?.sortOrder ?? 0) + 10, isVisible: false,
    }, { ok: 'Categoria criada (oculta até a tornar visível).' });
    if (r.ok) e.currentTarget.reset();
  }
  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <div className={s.pageHead}><div><h1 className={s.h1}>Categorias</h1><p className={s.sub}>Ordem, nomes e visibilidade. Uma categoria oculta retira os seus produtos da carta e bloqueia novos pedidos.</p></div></div>
      <FeedbackNotice f={feedback} />
      <table className={s.table}>
        <thead><tr><th>Ordem</th><th>Categoria</th><th>Produtos</th><th>Visível</th><th /></tr></thead>
        <tbody>
          {sorted.map((c, idx) => (
            <tr key={c.id} style={c.archivedAt ? { opacity: 0.55 } : undefined}>
              <td data-label="Ordem">
                <Button size="md" variant="ghost" aria-label={`Subir ${c.name}`} disabled={idx === 0 || pending !== null} onClick={() => void move(c, -1)}>↑</Button>
                <Button size="md" variant="ghost" aria-label={`Descer ${c.name}`} disabled={idx === sorted.length - 1 || pending !== null} onClick={() => void move(c, 1)}>↓</Button>
              </td>
              <td data-label="Categoria">
                {edit === c.id ? (
                  <form style={{ display: 'grid', gap: 6 }} onSubmit={async (e) => {
                    e.preventDefault();
                    const fd = new FormData(e.currentTarget);
                    const r = await act(`save-${c.id}`, `/categories/${c.id}`, { version: c.version, fields: { name: String(fd.get('name')), description: String(fd.get('description')) } }, { method: 'PATCH', ok: 'Categoria guardada.' });
                    if (r.ok) setEdit(null);
                  }}>
                    <input className={inputClass} name="name" defaultValue={c.name} maxLength={60} aria-label="Nome" />
                    <textarea className={inputClass} name="description" defaultValue={c.description} maxLength={300} aria-label="Descrição" />
                    <div className={s.actions}><Button type="submit" variant="primary" loading={pending === `save-${c.id}`}>Guardar</Button><Button type="button" variant="secondary" onClick={() => setEdit(null)}>Cancelar</Button></div>
                  </form>
                ) : (<><strong>{c.name}</strong><div className={s.sub}>/{c.slug} · {c.description}</div></>)}
              </td>
              <td data-label="Produtos" className="num">{c.itemCount}</td>
              <td data-label="Visível">
                <label className={s.switchRow}><input type="checkbox" className={s.check} checked={c.isVisible} disabled={pending !== null || Boolean(c.archivedAt)}
                  onChange={(e) => void act(`vis-${c.id}`, `/categories/${c.id}`, { version: c.version, fields: { isVisible: e.target.checked } }, { method: 'PATCH', ok: 'Visibilidade atualizada.' })} />{c.isVisible ? 'Sim' : 'Não'}</label>
              </td>
              <td data-label="">
                {edit !== c.id ? <Button size="md" variant="secondary" onClick={() => setEdit(c.id)}>Editar</Button> : null}
                {!c.archivedAt ? <Button size="md" variant="ghost" onClick={() => void act(`arch-${c.id}`, `/categories/${c.id}`, { version: c.version, fields: { archived: true } }, { method: 'PATCH', ok: 'Categoria arquivada.' })}>Arquivar</Button> : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <form className={s.card} onSubmit={create} style={{ maxWidth: 640 }}>
        <h2 className={s.h2}>Nova categoria</h2>
        <Field label="Nome">{(p) => <input {...p} name="name" required maxLength={60} />}</Field>
        <Field label="Descrição">{(p) => <input {...p} name="description" maxLength={300} />}</Field>
        <div><Button type="submit" variant="primary" loading={pending === 'create'}>Criar categoria</Button></div>
      </form>
    </div>
  );
}

/* ------------------------------------ Stations ------------------------------------ */
type StationRow = { id: string; code: string; name: string; kind: 'kitchen' | 'bar'; active: boolean; targetMinutes: number; sortOrder: number; version: number; productCount: number; activeLines: number; members: { id: string; displayName: string }[] };
export function StationManager({ stations }: { stations: StationRow[] }) {
  const { act, pending, feedback } = useAdminAction();
  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <div className={s.pageHead}><div><h1 className={s.h1}>Estações</h1><p className={s.sub}>Cada produto pertence a uma estação. Uma estação com linhas em curso ou produtos não pode ser desativada.</p></div></div>
      <FeedbackNotice f={feedback} />
      <table className={s.table}>
        <thead><tr><th>Estação</th><th>Tipo</th><th className="num">Prazo alvo</th><th className="num">Produtos</th><th className="num">Em curso</th><th>Membros</th><th>Ativa</th></tr></thead>
        <tbody>
          {stations.map((st) => (
            <tr key={st.id}>
              <td data-label="Estação"><strong>{st.name}</strong> <span className={s.pill}>{st.code}</span></td>
              <td data-label="Tipo">{st.kind === 'kitchen' ? 'Cozinha' : 'Bar'}</td>
              <td data-label="Prazo alvo" className="num">
                <select className={inputClass} style={{ width: 110, minHeight: 40 }} defaultValue={st.targetMinutes} aria-label={`Prazo alvo ${st.name}`}
                  onChange={(e) => void act(`t-${st.id}`, `/stations/${st.id}`, { version: st.version, fields: { targetMinutes: Number(e.target.value) } }, { method: 'PATCH', ok: 'Prazo atualizado.' })}>
                  {[3, 4, 5, 8, 10, 12, 15, 20, 25, 30, 45].map((m) => <option key={m} value={m}>{m} min</option>)}
                </select>
              </td>
              <td data-label="Produtos" className="num">{st.productCount}</td>
              <td data-label="Em curso" className="num">{st.activeLines}</td>
              <td data-label="Membros">{st.members.map((m) => m.displayName).join(', ') || '—'}</td>
              <td data-label="Ativa"><label className={s.switchRow}><input type="checkbox" className={s.check} checked={st.active} disabled={pending !== null}
                onChange={(e) => void act(`a-${st.id}`, `/stations/${st.id}`, { version: st.version, fields: { active: e.target.checked } }, { method: 'PATCH', ok: 'Estação atualizada.' })} />{st.active ? 'Sim' : 'Não'}</label></td>
            </tr>
          ))}
        </tbody>
      </table>
      <form className={s.card} style={{ maxWidth: 640 }} onSubmit={async (e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        await act('create', '/stations', { code: String(fd.get('code')).toUpperCase(), name: String(fd.get('name')), kind: String(fd.get('kind')), targetMinutes: Number(fd.get('target')) }, { ok: 'Estação criada.' });
      }}>
        <h2 className={s.h2}>Nova estação</h2>
        <div className={`${s.formGrid} ${s.formGrid2}`}>
          <Field label="Código" hint="2–8 letras/algarismos, ex.: PAST">{(p) => <input {...p} name="code" required pattern="[A-Za-z0-9]{2,8}" />}</Field>
          <Field label="Nome">{(p) => <input {...p} name="name" required maxLength={40} />}</Field>
          <Field label="Tipo">{(p) => <select {...p} name="kind"><option value="kitchen">Cozinha</option><option value="bar">Bar</option></select>}</Field>
          <Field label="Prazo alvo (min)">{(p) => <input {...p} name="target" type="number" min={1} max={120} defaultValue={10} />}</Field>
        </div>
        <div><Button type="submit" variant="primary" loading={pending === 'create'}>Criar estação</Button></div>
      </form>
    </div>
  );
}

/* ------------------------------------ Tables & QR ------------------------------------ */
type TableRow = { id: string; label: string; publicSlug: string; zone: string; seats: number; sortOrder: number; active: boolean; archivedAt: string | null; version: number;
  firstQrIssuedAt: string | null; qr: null | { id: string; issuedAt: string; keyVersion: number; activeSessions: number }; visit: null | { id: string; status: 'open' | 'billing'; openedAt: string } };
export function TableManager({ slug, tables }: { slug: string; tables: TableRow[] }) {
  const { act, pending, feedback } = useAdminAction();
  const [rotate, setRotate] = useState<TableRow | null>(null);
  const [revokeSessions, setRevokeSessions] = useState(true);
  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <div className={s.pageHead}>
        <div><h1 className={s.h1}>Mesas e QR</h1><p className={s.sub}>{tables.filter((t) => !t.archivedAt).length} mesas · {tables.filter((t) => !t.archivedAt).reduce((a, t) => a + t.seats, 0)} lugares. O QR identifica a mesa; para pedir é sempre preciso o código de atendimento.</p></div>
        <Link href={`/r/${slug}/admin/mesas/imprimir`} className={s.sub} style={{ fontWeight: 700 }}>Imprimir todos os QR</Link>
      </div>
      <FeedbackNotice f={feedback} />
      <table className={s.table}>
        <thead><tr><th>Mesa</th><th>Zona</th><th className="num">Lugares</th><th>Estado</th><th>QR</th><th>Ativa</th><th /></tr></thead>
        <tbody>
          {tables.map((t) => (
            <tr key={t.id} style={t.archivedAt ? { opacity: 0.55 } : undefined}>
              <td data-label="Mesa"><strong>{t.label}</strong><div className={s.sub}>/mesa/{t.publicSlug}</div></td>
              <td data-label="Zona">
                <select className={inputClass} style={{ minHeight: 40, width: 120 }} defaultValue={t.zone} disabled={Boolean(t.archivedAt)} aria-label={`Zona da mesa ${t.label}`}
                  onChange={(e) => void act(`z-${t.id}`, `/tables/${t.id}`, { version: t.version, fields: { zone: e.target.value } }, { method: 'PATCH', ok: 'Zona atualizada.' })}>
                  {[...new Set(['Sala', 'Pátio', 'Balcão', t.zone])].map((z) => <option key={z} value={z}>{z}</option>)}
                </select>
              </td>
              <td data-label="Lugares" className="num">
                <input className={inputClass} type="number" min={1} max={30} defaultValue={t.seats} style={{ width: 80, minHeight: 40 }} aria-label={`Lugares da mesa ${t.label}`}
                  onBlur={(e) => { const n = Number(e.target.value); if (n !== t.seats) void act(`s-${t.id}`, `/tables/${t.id}`, { version: t.version, fields: { seats: n } }, { method: 'PATCH', ok: 'Lugares atualizados.' }); }} />
              </td>
              <td data-label="Estado"><StatusBadge meta={VISIT_STATE[t.visit?.status ?? 'free']} /></td>
              <td data-label="QR">{t.qr ? <span className={s.sub}>Emitido {formatDateTime(t.qr.issuedAt)} · {t.qr.activeSessions} sessão(ões)</span> : <span className={s.pill}>Sem QR</span>}</td>
              <td data-label="Ativa"><label className={s.switchRow}><input type="checkbox" className={s.check} checked={t.active} disabled={pending !== null || Boolean(t.archivedAt)}
                onChange={(e) => void act(`a-${t.id}`, `/tables/${t.id}`, { version: t.version, fields: { active: e.target.checked } }, { method: 'PATCH', ok: 'Mesa atualizada.' })} />{t.active ? 'Sim' : 'Não'}</label></td>
              <td data-label="">
                <div className={s.actions}>
                  {t.qr ? <Link className={s.sub} href={`/r/${slug}/admin/mesas/${t.id}/qr`}>Imprimir</Link> : null}
                  {!t.archivedAt ? (t.qr
                    ? <Button size="md" variant="secondary" onClick={() => { setRevokeSessions(true); setRotate(t); }}>Rotacionar</Button>
                    : <Button size="md" variant="primary" loading={pending === `qr-${t.id}`} onClick={() => void act(`qr-${t.id}`, `/tables/${t.id}/qr`, { version: t.version, confirmImpact: true, revokeSessions: false }, { ok: `QR da mesa ${t.label} emitido.` })}>Gerar QR</Button>) : null}
                  {!t.archivedAt && !t.visit ? <Button size="md" variant="ghost" onClick={() => void act(`ar-${t.id}`, `/tables/${t.id}`, { version: t.version, fields: { archived: true } }, { method: 'PATCH', ok: 'Mesa arquivada (QR revogado).' })}>Arquivar</Button> : null}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <form className={s.card} style={{ maxWidth: 640 }} onSubmit={async (e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        const r = await act('create', '/tables', { label: String(fd.get('label')), zone: String(fd.get('zone')), seats: Number(fd.get('seats')), sortOrder: tables.length + 1 }, { ok: 'Mesa criada. Gere o QR para imprimir.' });
        if (r.ok) (e.target as HTMLFormElement).reset();
      }}>
        <h2 className={s.h2}>Nova mesa</h2>
        <div className={`${s.formGrid} ${s.formGrid2}`}>
          <Field label="Rótulo" hint="Único; fica fixo depois de emitir o QR.">{(p) => <input {...p} name="label" required pattern="[A-Za-z0-9]{1,8}" maxLength={8} />}</Field>
          <Field label="Zona">{(p) => <input {...p} name="zone" required defaultValue="Sala" maxLength={30} />}</Field>
          <Field label="Lugares">{(p) => <input {...p} name="seats" type="number" min={1} max={30} defaultValue={4} required />}</Field>
        </div>
        <div><Button type="submit" variant="primary" loading={pending === 'create'}>Criar mesa</Button></div>
      </form>
      {rotate ? (
        <ConfirmDialog open onOpenChange={(o) => { if (!o) setRotate(null); }} tone="danger" confirmLabel="Rotacionar QR" loading={pending === 'rotate'}
          title={`Rotacionar o QR da mesa ${rotate.label}?`}
          description={`O QR impresso atual deixa de funcionar. ${rotate.qr?.activeSessions ?? 0} telemóvel(is) com sessão ativa originada neste QR.`}
          onConfirm={async () => { const r = await act('rotate', `/tables/${rotate.id}/qr`, { version: rotate.version, confirmImpact: true, revokeSessions }, { ok: `Novo QR emitido para a mesa ${rotate.label}. Imprima-o.` }); if (r.ok) setRotate(null); }}>
          <label className={s.switchRow}><input type="checkbox" className={s.check} checked={revokeSessions} onChange={(e) => setRevokeSessions(e.target.checked)} />Revogar também as sessões ativas originadas neste QR (recomendado)</label>
          <p className={s.sub}>Pedidos e conta atuais continuam; nada é apagado.</p>
        </ConfirmDialog>
      ) : null}
    </div>
  );
}

/* ------------------------------------ Team ------------------------------------ */
type MemberRow = { id: string; displayName: string; status: 'invited' | 'active' | 'suspended'; email: string; isOwner: boolean; version: number; roles: string[]; stationIds: string[]; acceptedAt: string | null };
type TeamData = { me: string; isOwner: boolean; members: MemberRow[]; stations: { id: string; code: string; name: string; kind: 'kitchen' | 'bar' }[] };
const ROLES = ['admin', 'floor', 'kitchen', 'bar', 'cashier'] as const;
export function TeamManager({ data }: { data: TeamData }) {
  const { act, pending, feedback } = useAdminAction();
  const [editing, setEditing] = useState<string | null>(null);
  const [transfer, setTransfer] = useState<MemberRow | null>(null);
  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <div className={s.pageHead}><div><h1 className={s.h1}>Equipa</h1><p className={s.sub}>Papéis fixos: administrador, salão, cozinha, bar e caixa. Só o proprietário gere administradores e titularidade.</p></div></div>
      <FeedbackNotice f={feedback} />
      <table className={s.table}>
        <thead><tr><th>Pessoa</th><th>Papéis</th><th>Estado</th><th /></tr></thead>
        <tbody>
          {data.members.map((m) => (
            <tr key={m.id}>
              <td data-label="Pessoa"><strong>{m.displayName}</strong>{m.id === data.me ? ' (eu)' : ''}<div className={s.sub}>{m.email}</div></td>
              <td data-label="Papéis">
                {editing === m.id ? (
                  <form onSubmit={async (e) => {
                    e.preventDefault();
                    const fd = new FormData(e.currentTarget);
                    const r = await act(`r-${m.id}`, `/members/${m.id}`, { version: m.version, fields: { roles: fd.getAll('role').map(String), stationIds: fd.getAll('station').map(String) } }, { method: 'PATCH', ok: 'Papéis atualizados.' });
                    if (r.ok) setEditing(null);
                  }} style={{ display: 'grid', gap: 6 }}>
                    <div className={s.toolbar}>{ROLES.map((r) => (
                      <label key={r} className={s.switchRow}><input type="checkbox" className={s.check} name="role" value={r} defaultChecked={m.roles.includes(r)} disabled={r === 'admin' && !data.isOwner} />{ROLE_LABEL[r]}</label>
                    ))}</div>
                    <div className={s.toolbar}>{data.stations.map((st) => (
                      <label key={st.id} className={s.switchRow}><input type="checkbox" className={s.check} name="station" value={st.id} defaultChecked={m.stationIds.includes(st.id)} />Estação {st.name}</label>
                    ))}</div>
                    <div className={s.actions}><Button type="submit" variant="primary" loading={pending === `r-${m.id}`}>Guardar</Button><Button type="button" variant="secondary" onClick={() => setEditing(null)}>Cancelar</Button></div>
                  </form>
                ) : (
                  <span>{m.isOwner ? 'Proprietário · ' : ''}{m.roles.filter((r) => !(m.isOwner && r === 'admin')).map((r) => ROLE_LABEL[r]).join(' · ')}
                    {m.stationIds.length ? <span className={s.sub}> ({data.stations.filter((st) => m.stationIds.includes(st.id)).map((st) => st.code).join(', ')})</span> : null}</span>
                )}
              </td>
              <td data-label="Estado"><span className={s.pill}>{m.status === 'invited' ? 'Convite pendente' : m.status === 'active' ? 'Ativo' : 'Suspenso'}</span></td>
              <td data-label="">
                <div className={s.actions}>
                  {!m.isOwner && editing !== m.id ? <Button size="md" variant="secondary" onClick={() => setEditing(m.id)}>Papéis</Button> : null}
                  {!m.isOwner && m.id !== data.me && m.status !== 'invited' ? (
                    <Button size="md" variant="ghost" loading={pending === `st-${m.id}`}
                      onClick={() => void act(`st-${m.id}`, `/members/${m.id}`, { version: m.version, fields: { status: m.status === 'active' ? 'suspended' : 'active' } }, { method: 'PATCH', ok: m.status === 'active' ? 'Acesso suspenso (efeito imediato).' : 'Acesso reativado.' })}>
                      {m.status === 'active' ? 'Suspender' : 'Reativar'}</Button>
                  ) : null}
                  {data.isOwner && !m.isOwner && m.status === 'active' ? <Button size="md" variant="ghost" onClick={() => setTransfer(m)}>Transferir titularidade</Button> : null}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <form className={s.card} style={{ maxWidth: 720 }} onSubmit={async (e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        const r = await act<{ delivery: string }>('invite', '/members', {
          email: String(fd.get('email')), displayName: String(fd.get('name')), roles: fd.getAll('role').map(String), stationIds: fd.getAll('station').map(String),
        });
        if (r.ok) {
          const d = r.data.delivery;
          alertLike(d);
          (e.target as HTMLFormElement).reset();
        }
      }}>
        <h2 className={s.h2}>Convidar pessoa</h2>
        <div className={`${s.formGrid} ${s.formGrid2}`}>
          <Field label="Nome">{(p) => <input {...p} name="name" required maxLength={80} />}</Field>
          <Field label="Email">{(p) => <input {...p} name="email" type="email" required maxLength={160} />}</Field>
        </div>
        <div className={s.toolbar}>{ROLES.map((r) => (
          <label key={r} className={s.switchRow}><input type="checkbox" className={s.check} name="role" value={r} defaultChecked={r === 'floor'} disabled={r === 'admin' && !data.isOwner} />{ROLE_LABEL[r]}</label>
        ))}</div>
        <div className={s.toolbar}>{data.stations.map((st) => (
          <label key={st.id} className={s.switchRow}><input type="checkbox" className={s.check} name="station" value={st.id} />Estação {st.name}</label>
        ))}</div>
        <p className={s.sub}>O convite só fica ativo quando a pessoa entra com o mesmo email e aceita. O envio do email depende do SMTP configurado.</p>
        <div><Button type="submit" variant="primary" loading={pending === 'invite'}>Enviar convite</Button></div>
        <p id="invite-result" role="status" className={s.sub} />
      </form>
      {transfer ? (
        <ConfirmDialog open onOpenChange={(o) => { if (!o) setTransfer(null); }} tone="danger" confirmLabel="Transferir" loading={pending === 'transfer'}
          title={`Transferir a titularidade para ${transfer.displayName}?`} description="Passa a ser a proprietária/o proprietário. Continua como administrador."
          onConfirm={async () => { const r = await act('transfer', `/members/${transfer.id}/transfer-ownership`, {}, { ok: 'Titularidade transferida.' }); if (r.ok) setTransfer(null); }} />
      ) : null}
    </div>
  );
}

function alertLike(delivery: string) {
  const el = document.getElementById('invite-result');
  if (!el) return;
  el.textContent = delivery === 'invited' ? 'Convite criado e email de convite pedido ao serviço de autenticação.'
    : delivery === 'existing_account' ? 'Convite criado. A pessoa já tem conta: ao entrar verá o convite pendente em “Restaurantes”.'
    : 'Convite criado, mas o email não pôde ser enviado (verifique o SMTP). A pessoa pode entrar e aceitar se já tiver conta.';
}
