import type { ReactNode } from 'react';
import { AdminNav } from '@/components/staff/admin/AdminNav';
import { Forbidden } from '@/components/staff/Forbidden';
import { requireRole } from '@/modules/auth/staff.server';
import s from '@/components/staff/staff.module.css';

export default async function AdminLayout({ children, params }: { children: ReactNode; params: Promise<{ restaurantSlug: string }> }) {
  const slug = (await params).restaurantSlug;
  const me = await requireRole(slug, []);
  if (!me) return <Forbidden slug={slug} />;
  return (
    <div className={s.adminWrap}>
      <AdminNav slug={slug} />
      <div style={{ minWidth: 0 }}>
        <AdminNav slug={slug} mobile />
        <div className={s.page}>{children}</div>
      </div>
    </div>
  );
}
