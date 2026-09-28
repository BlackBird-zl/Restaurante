'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import s from '@/components/public/public.module.css';
import { Icon } from '@/components/ui/Icon';

/**
 * "Continuar na Mesa 14": resolved by a private, no-store request from the browser,
 * so public pages stay free of session data (Arquitetura §3).
 */
export function TableContextLink({ basePath, itemSlug }: { basePath: string; itemSlug?: string }) {
  const [label, setLabel] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    fetch(`${basePath}/api/v1/guest/context`, { cache: 'no-store', credentials: 'same-origin' })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => { if (alive && j?.data?.tableLabel) setLabel(j.data.tableLabel); })
      .catch(() => undefined);
    return () => { alive = false; };
  }, [basePath]);
  if (!label) return null;
  const href = `${basePath}/mesa/${label.toLowerCase()}${itemSlug ? `/carta/${itemSlug}` : '/carta'}`;
  return (
    <Link className={s.continueTable} href={href}>
      <Icon name="table" size={18} /> Continuar na Mesa {label}
    </Link>
  );
}
