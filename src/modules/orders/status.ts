/** The only place where status strings and labels are defined (Plano, Fase 1). */
import type { IconName } from '@/components/ui/Icon';

export const LINE_STATUSES = ['pending', 'preparing', 'ready', 'delivering', 'delivered', 'cancelled'] as const;
export type LineStatus = (typeof LINE_STATUSES)[number];
export type OrderStatus = 'new' | 'preparing' | 'partially_ready' | 'ready' | 'partially_served' | 'delivered' | 'cancelled';
export type CallType = 'service' | 'cutlery' | 'help' | 'bill';
export type CallStatus = 'new' | 'claimed' | 'completed' | 'cancelled';
export type BillStatus = 'open' | 'requested' | 'settled' | 'void';
export type VisitStatus = 'open' | 'billing' | 'closed';
export type ReservationStatus = 'pending' | 'confirmed' | 'declined' | 'cancelled' | 'completed' | 'no_show';
export type PaymentMethod = 'cash' | 'external_card' | 'external_mbway';

type Tone = 'new' | 'preparing' | 'ready' | 'delivering' | 'done' | 'cancelled' | 'late';
export type StatusMeta = { label: string; guestLabel?: string; tone: Tone; icon: IconName };

export const LINE_STATUS: Record<LineStatus, StatusMeta> = {
  pending: { label: 'Novo', guestLabel: 'Recebido', tone: 'new', icon: 'clock' },
  preparing: { label: 'Em preparação', guestLabel: 'Em preparação', tone: 'preparing', icon: 'flame' },
  ready: { label: 'Pronto', guestLabel: 'Pronto', tone: 'ready', icon: 'check' },
  delivering: { label: 'A caminho', guestLabel: 'A caminho', tone: 'delivering', icon: 'arrowRight' },
  delivered: { label: 'Entregue', guestLabel: 'Entregue', tone: 'done', icon: 'check' },
  cancelled: { label: 'Anulado', guestLabel: 'Anulado', tone: 'cancelled', icon: 'x' },
};

export const ORDER_STATUS: Record<OrderStatus, StatusMeta> = {
  new: { label: 'Recebido', tone: 'new', icon: 'clock' },
  preparing: { label: 'Em preparação', tone: 'preparing', icon: 'flame' },
  partially_ready: { label: 'Parcialmente pronto', tone: 'ready', icon: 'check' },
  ready: { label: 'Pronto', tone: 'ready', icon: 'check' },
  partially_served: { label: 'Parcialmente servido', tone: 'delivering', icon: 'arrowRight' },
  delivered: { label: 'Servido', tone: 'done', icon: 'check' },
  cancelled: { label: 'Anulado', tone: 'cancelled', icon: 'x' },
};

export const CALL_TYPE: Record<CallType, { label: string; guestLabel: string; icon: IconName }> = {
  cutlery: { label: 'Talheres', guestLabel: 'Talheres', icon: 'utensils' },
  help: { label: 'Ajuda', guestLabel: 'Preciso de ajuda', icon: 'hand' },
  service: { label: 'Chamar equipa', guestLabel: 'Chamar equipa', icon: 'bell' },
  bill: { label: 'Conta', guestLabel: 'Pedir a conta', icon: 'receipt' },
};

export const CALL_STATUS: Record<CallStatus, StatusMeta> = {
  new: { label: 'Novo', guestLabel: 'Chamado enviado', tone: 'new', icon: 'bell' },
  claimed: { label: 'Assumido', guestLabel: 'A equipa está a caminho', tone: 'delivering', icon: 'arrowRight' },
  completed: { label: 'Concluído', guestLabel: 'Atendido', tone: 'done', icon: 'check' },
  cancelled: { label: 'Cancelado', guestLabel: 'Cancelado', tone: 'cancelled', icon: 'x' },
};

export const BILL_STATUS: Record<BillStatus, StatusMeta> = {
  open: { label: 'Aberta', tone: 'new', icon: 'receipt' },
  requested: { label: 'Conta pedida', tone: 'preparing', icon: 'receipt' },
  settled: { label: 'Recebida e fechada', tone: 'done', icon: 'check' },
  void: { label: 'Anulada (sem consumo)', tone: 'cancelled', icon: 'x' },
};

export const VISIT_STATE: Record<'free' | 'open' | 'billing', StatusMeta> = {
  free: { label: 'Livre', tone: 'done', icon: 'table' },
  open: { label: 'Em atendimento', tone: 'new', icon: 'users' },
  billing: { label: 'A fechar', tone: 'preparing', icon: 'receipt' },
};

export const RESERVATION_STATUS: Record<ReservationStatus, StatusMeta> = {
  pending: { label: 'Por confirmar', tone: 'preparing', icon: 'clock' },
  confirmed: { label: 'Confirmada', tone: 'ready', icon: 'check' },
  declined: { label: 'Recusada', tone: 'cancelled', icon: 'x' },
  cancelled: { label: 'Cancelada', tone: 'cancelled', icon: 'x' },
  completed: { label: 'Concluída', tone: 'done', icon: 'check' },
  no_show: { label: 'Não compareceu', tone: 'late', icon: 'alert' },
};

export const PAYMENT_METHOD: Record<PaymentMethod, string> = {
  cash: 'Numerário',
  external_card: 'Cartão (terminal externo)',
  external_mbway: 'MB WAY (externo)',
};

export const ROLE_LABEL: Record<string, string> = {
  owner: 'Proprietário', admin: 'Administrador', floor: 'Salão', kitchen: 'Cozinha', bar: 'Bar', cashier: 'Caixa',
};

/** Mirrors app_private.order_status (derived, read-only). */
export function deriveOrderStatus(statuses: readonly LineStatus[]): OrderStatus {
  const active = statuses.filter((s) => s !== 'cancelled');
  if (active.length === 0) return 'cancelled';
  if (active.every((s) => s === 'delivered')) return 'delivered';
  if (active.some((s) => s === 'delivered' || s === 'delivering')) return 'partially_served';
  if (active.every((s) => s === 'ready')) return 'ready';
  if (active.some((s) => s === 'ready')) return 'partially_ready';
  if (active.some((s) => s === 'preparing')) return 'preparing';
  return 'new';
}

/** KDS column for a station ticket (Arquitetura §5.3). Lines passed are the ticket's own lines. */
export function ticketColumn(statuses: readonly LineStatus[]): 'new' | 'preparing' | 'ready' | null {
  const active = statuses.filter((s) => s !== 'cancelled' && s !== 'delivered' && s !== 'delivering');
  if (active.length === 0) return null;
  if (active.every((s) => s === 'pending')) return 'new';
  if (active.some((s) => s === 'pending' || s === 'preparing')) return 'preparing';
  return 'ready';
}

export function padOrderNumber(n: number): string {
  return String(n).padStart(4, '0');
}
