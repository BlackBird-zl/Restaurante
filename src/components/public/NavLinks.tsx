'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

/** Navigation links with aria-current derived from the visible URL (works on tenant host and /d/{slug}). */
export function NavLinks({ basePath, items }: { basePath: string; items: { href: string; label: string }[] }) {
  const pathname = usePathname() ?? '/';
  const rel = basePath && pathname.startsWith(basePath) ? pathname.slice(basePath.length) || '/' : pathname;
  return (
    <>
      {items.map((n) => {
        const active = rel === n.href || rel.startsWith(`${n.href}/`);
        return <Link key={n.href} href={`${basePath}${n.href}`} aria-current={active ? 'page' : undefined}>{n.label}</Link>;
      })}
    </>
  );
}
