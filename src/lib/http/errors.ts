/** Domain error codes shared by RPCs, Route Handlers and UI (Arquitetura §9.1). */
export const ERROR_STATUS: Record<string, number> = {
  INVALID_INPUT: 400,
  AUTH_REQUIRED: 401,
  GUEST_SESSION_EXPIRED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  VERSION_CONFLICT: 409,
  PRICE_CHANGED: 409,
  ITEM_UNAVAILABLE: 409,
  VISIT_NOT_OPEN: 409,
  ALREADY_CLAIMED: 409,
  PENDING_ITEMS: 409,
  IDEMPOTENCY_CONFLICT: 409,
  FIELD_CONFLICT: 409,
  DEPENDENCY: 409,
  INVALID_STATE: 409,
  CONFIRMATION_REQUIRED: 409,
  ORDERING_PAUSED: 409,
  LIMIT_EXCEEDED: 409,
  INVALID_ASSIGNEE: 409,
  BILL_CLOSED: 409,
  CONFLICT: 409,
  OWNER_REQUIRED: 409,
  IMMUTABLE: 409,
  INVALID_CODE: 400,
  CODE_EXPIRED: 400,
  NO_OPEN_VISIT: 409,
  TABLE_INACTIVE: 410,
  QR_INVALID: 404,
  QR_REVOKED: 410,
  VISIT_CLOSED: 410,
  RATE_LIMITED: 429,
  SERVICE_UNAVAILABLE: 503,
  INTERNAL: 500,
};

/** Human messages in pt-PT. Never expose SQL or internal detail. */
export const ERROR_MESSAGES: Record<string, string> = {
  INVALID_INPUT: 'Verifique os dados indicados.',
  AUTH_REQUIRED: 'Inicie sessão para continuar.',
  GUEST_SESSION_EXPIRED: 'O acesso a esta mesa expirou. Peça um novo código à equipa.',
  FORBIDDEN: 'Não tem permissão para esta ação.',
  NOT_FOUND: 'Não encontrado.',
  VERSION_CONFLICT: 'Os dados mudaram entretanto. Atualizámos a informação; confirme de novo.',
  PRICE_CHANGED: 'O preço de um produto mudou. Reveja o pedido antes de enviar.',
  ITEM_UNAVAILABLE: 'Um dos produtos deixou de estar disponível. O pedido não foi enviado.',
  VISIT_NOT_OPEN: 'A mesa está a fechar a conta. Já não é possível adicionar pedidos.',
  ALREADY_CLAIMED: 'Outra pessoa da equipa já assumiu esta tarefa.',
  PENDING_ITEMS: 'Ainda há itens por entregar ou anular.',
  IDEMPOTENCY_CONFLICT: 'Este envio foi alterado depois de enviado. Envie de novo.',
  FIELD_CONFLICT: 'Esse valor já está a ser usado.',
  DEPENDENCY: 'Não é possível: existem dependências ativas.',
  INVALID_STATE: 'Esta ação não é possível no estado atual.',
  CONFIRMATION_REQUIRED: 'Confirme o impacto desta ação.',
  ORDERING_PAUSED: 'Os pedidos pela mesa estão pausados neste momento. Chame a equipa.',
  LIMIT_EXCEEDED: 'O pedido excede o limite permitido. Divida-o em envios menores.',
  INVALID_ASSIGNEE: 'Essa pessoa não pode receber esta tarefa.',
  BILL_CLOSED: 'A conta já está fechada.',
  CONFLICT: 'Conflito com o estado atual.',
  OWNER_REQUIRED: 'O restaurante precisa sempre de um proprietário ativo.',
  IMMUTABLE: 'Registo imutável.',
  INVALID_CODE: 'Código incorreto. Confirme com a equipa.',
  CODE_EXPIRED: 'Este código expirou. Peça um novo à equipa.',
  NO_OPEN_VISIT: 'A equipa ainda não abriu o atendimento desta mesa.',
  TABLE_INACTIVE: 'Esta mesa não está disponível. Chame a equipa.',
  QR_INVALID: 'Este código QR não é reconhecido. Chame a equipa.',
  QR_REVOKED: 'Este código QR já não é válido. Chame a equipa.',
  VISIT_CLOSED: 'Este atendimento terminou.',
  RATE_LIMITED: 'Demasiadas tentativas. Aguarde um pouco.',
  SERVICE_UNAVAILABLE: 'Serviço temporariamente indisponível. Tente de novo.',
  INTERNAL: 'Ocorreu um erro inesperado.',
};

export type ApiErrorBody = {
  error: { code: string; message: string; details?: unknown; fieldErrors?: Record<string, string>; retryAfterSeconds?: number; currentVersion?: number };
  meta: { requestId: string };
};

export type ApiSuccess<T> = { data: T; meta: { requestId: string; serverTime: string; revision?: number } };

export function statusFor(code: string): number {
  return ERROR_STATUS[code] ?? 500;
}

export function messageFor(code: string): string {
  return ERROR_MESSAGES[code] ?? ERROR_MESSAGES.INTERNAL!;
}
