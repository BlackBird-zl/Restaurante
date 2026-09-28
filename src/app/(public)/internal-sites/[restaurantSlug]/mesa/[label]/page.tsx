import Link from 'next/link';
import { JoinForm, TableHome } from '@/components/table/TableViews';
import { Notice } from '@/components/ui/primitives';
import s from '@/components/table/table.module.css';
import { getPublicContext } from '@/modules/tenancy/context.server';
import { getTableState } from '@/modules/tables/state.server';
import { SwitchTable } from '@/components/table/SwitchTable';

const STATES: Record<string, string> = {
  'qr-invalido': 'Este código QR não é reconhecido. Chame a equipa.',
  'qr-revogado': 'Este código QR já não é válido. Chame a equipa.',
  limite: 'Demasiadas leituras seguidas. Aguarde um minuto.',
  indisponivel: 'Serviço temporariamente indisponível. Tente de novo.',
};

type Props = { params: Promise<{ restaurantSlug: string; label: string }>; searchParams: Promise<{ estado?: string }> };

export default async function TableEntry({ params, searchParams }: Props) {
  const p = await params;
  const { estado } = await searchParams;
  const ctx = await getPublicContext(p.restaurantSlug);
  const state = await getTableState(ctx, p.label);
  const base = `${ctx.basePath}/mesa/${state.label.toLowerCase()}`;
  if (state.mode === 'session') return <TableHome />;
  const otherTable = state.otherTable;
  if (state.mode === 'join') {
    if (otherTable) return <SwitchTable basePath={ctx.basePath} from={otherTable} to={state.label} />;
    return <JoinForm visitState={state.visitState} />;
  }
  return (
    <div className={s.hello}>
      <h1 className={s.helloTitle}>Mesa {state.label}</h1>
      {estado && STATES[estado] ? <Notice tone="warn">{STATES[estado]}</Notice> : null}
      {state.notice === 'ended' ? <Notice tone="info">O atendimento anterior deste dispositivo terminou.</Notice> : null}
      {otherTable ? <Notice tone="info">Este telemóvel está ligado à Mesa {otherTable}. <Link href={`${ctx.basePath}/mesa/${otherTable.toLowerCase()}`}>Voltar à Mesa {otherTable}</Link></Notice> : null}
      <p>Leia o QR da mesa para pedir. A carta está disponível para consulta.</p>
      <Link className={s.actionBtn} href={`${base}/carta`}>Ver a carta<span /></Link>
    </div>
  );
}
