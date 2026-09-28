'use client';
import type { CSSProperties, ReactNode } from 'react';
import { QueryProvider } from '@/lib/realtime/connection';
import type { GuestSnapshot } from '@/modules/tables/types';
import { TableProvider } from './TableProvider';
import { TableShell } from './TableShell';

export function TableRoot(props: {
  children: ReactNode; tenantId: string; basePath: string; label: string; restaurantName: string;
  mode: 'session' | 'join' | 'public'; initialSnapshot: GuestSnapshot | null; style: CSSProperties; preset: string; drinksHref: string | null;
}) {
  const { children, style, preset, drinksHref, ...rest } = props;
  return (
    <div style={style} data-preset={preset}>
      <QueryProvider>
        <TableProvider key={`${rest.mode}:${rest.initialSnapshot?.session.publicId ?? ''}`} {...rest}>
          <TableShell drinksHref={drinksHref}>{children}</TableShell>
        </TableProvider>
      </QueryProvider>
    </div>
  );
}
