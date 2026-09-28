import type { ReactNode } from 'react';
import s from './ui.module.css';
import { Icon, type IconName } from './Icon';

/** Server-safe primitives (usable from Server and Client Components). */
export type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success' | 'default';
export type Size = 'md' | 'lg' | 'xl';

export function btnClass(variant: Variant = 'default', size: Size = 'md', block = false, extra = '') {
  return [s.btn, variant !== 'default' ? s[variant] : '', size !== 'md' ? s[size] : '', block ? s.block : '', extra].filter(Boolean).join(' ');
}

export const inputClass = s.input;

export function Notice({ tone = 'info', children, icon }: { tone?: 'info' | 'warn' | 'danger' | 'ok'; children: ReactNode; icon?: IconName }) {
  const cls = { info: s.nInfo, warn: s.nWarn, danger: s.nDanger, ok: s.nOk }[tone];
  const ic: IconName = icon ?? (tone === 'ok' ? 'check' : tone === 'info' ? 'info' : 'alert');
  return <div className={`${s.notice} ${cls}`} role={tone === 'danger' ? 'alert' : 'status'}><Icon name={ic} size={18} /><div>{children}</div></div>;
}

export function EmptyState({ title, children, icon = 'info', action }: { title: string; children?: ReactNode; icon?: IconName; action?: ReactNode }) {
  return (
    <div className={s.empty}>
      <Icon name={icon} size={28} />
      <p className={s.emptyTitle}>{title}</p>
      {children ? <div>{children}</div> : null}
      {action}
    </div>
  );
}
