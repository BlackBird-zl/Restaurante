'use client';
import * as RDialog from '@radix-ui/react-dialog';
import { forwardRef, useId, type ButtonHTMLAttributes, type ReactNode } from 'react';
import s from './ui.module.css';
import { Icon, type IconName } from './Icon';
import { btnClass, type Size, type Variant } from './basic';
export { btnClass, Notice, EmptyState, inputClass } from './basic';


export const Button = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant; size?: Size; block?: boolean; loading?: boolean; icon?: IconName;
}>(function Button({ variant = 'default', size = 'md', block, loading, icon, className, children, disabled, ...rest }, ref) {
  return (
    <button ref={ref} className={btnClass(variant, size, block, className)} disabled={disabled || loading} aria-busy={loading || undefined} {...rest}>
      {loading ? <span className={s.spinner} aria-hidden /> : icon ? <Icon name={icon} size={18} /> : null}
      <span>{children}</span>
    </button>
  );
});

export function Field({ label, hint, error, children, id: idProp }: {
  label: ReactNode; hint?: ReactNode; error?: string | null; id?: string;
  children: (props: { id: string; 'aria-describedby'?: string; 'aria-invalid'?: boolean; className: string }) => ReactNode;
}) {
  const auto = useId();
  const id = idProp ?? auto;
  const hintId = hint ? `${id}-hint` : undefined;
  const errId = error ? `${id}-err` : undefined;
  return (
    <div className={s.field}>
      <label className={s.label} htmlFor={id}>{label}</label>
      {children({ id, 'aria-describedby': [hintId, errId].filter(Boolean).join(' ') || undefined, 'aria-invalid': error ? true : undefined, className: s.input ?? '' })}
      {hint ? <p id={hintId} className={s.hint}>{hint}</p> : null}
      {error ? <p id={errId} className={s.error} role="alert"><Icon name="alert" size={16} />{error}</p> : null}
    </div>
  );
}




/** Accessible modal/bottom-sheet (focus trap, Escape, focus return — Radix). */
export function Sheet({ open, onOpenChange, title, description, children, variant = 'sheet' }: {
  open: boolean; onOpenChange: (o: boolean) => void; title: string; description?: string; children: ReactNode; variant?: 'sheet' | 'dialog';
}) {
  return (
    <RDialog.Root open={open} onOpenChange={onOpenChange}>
      <RDialog.Portal>
        <RDialog.Overlay className={s.overlay} />
        <RDialog.Content className={variant === 'sheet' ? s.sheet : s.dialog} aria-describedby={description ? undefined : undefined}>
          <div className={s.dialogHeader}>
            <div>
              <RDialog.Title className={s.dialogTitle}>{title}</RDialog.Title>
              {description ? <RDialog.Description className={s.dialogDesc}>{description}</RDialog.Description> : null}
            </div>
            <RDialog.Close className={s.closeBtn} aria-label="Fechar"><Icon name="close" /></RDialog.Close>
          </div>
          {children}
        </RDialog.Content>
      </RDialog.Portal>
    </RDialog.Root>
  );
}

export function ConfirmDialog({ open, onOpenChange, title, description, confirmLabel, onConfirm, loading, tone = 'primary', children }: {
  open: boolean; onOpenChange: (o: boolean) => void; title: string; description?: string; confirmLabel: string;
  onConfirm: () => void; loading?: boolean; tone?: 'primary' | 'danger' | 'success'; children?: ReactNode;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange} title={title} description={description} variant="dialog">
      {children}
      <div className={s.dialogActions}>
        <Button variant="secondary" onClick={() => onOpenChange(false)} disabled={loading}>Cancelar</Button>
        <Button variant={tone} onClick={onConfirm} loading={loading}>{confirmLabel}</Button>
      </div>
    </Sheet>
  );
}

export const uiStyles = s;
