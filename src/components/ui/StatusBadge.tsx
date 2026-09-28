import type { CSSProperties } from 'react';
import { Icon } from './Icon';
import s from './ui.module.css';
import type { StatusMeta } from '@/modules/orders/status';

const TONES: Record<StatusMeta['tone'], [string, string]> = {
  new: ['var(--st-new)', 'var(--st-new-bg)'],
  preparing: ['var(--st-preparing)', 'var(--st-preparing-bg)'],
  ready: ['var(--st-ready)', 'var(--st-ready-bg)'],
  delivering: ['var(--st-delivering)', 'var(--st-delivering-bg)'],
  done: ['var(--st-done)', 'var(--st-done-bg)'],
  cancelled: ['var(--st-cancelled)', 'var(--st-cancelled-bg)'],
  late: ['var(--st-late)', 'var(--danger-bg)'],
};

/** Status always shown as text + icon (never colour only). */
export function StatusBadge({ meta, guest = false, label }: { meta: StatusMeta; guest?: boolean; label?: string }) {
  const [fg, bg] = TONES[meta.tone];
  return (
    <span className={s.badge} style={{ '--b-fg': fg, '--b-bg': bg } as CSSProperties}>
      <Icon name={meta.icon} size={14} />
      {label ?? (guest && meta.guestLabel ? meta.guestLabel : meta.label)}
    </span>
  );
}
