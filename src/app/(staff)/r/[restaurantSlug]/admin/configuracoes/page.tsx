import type { Metadata } from 'next';
import type { ComponentProps } from 'react';
import { SettingsForm } from '@/components/staff/admin/SettingsForm';
import { staffRpc } from '@/modules/auth/staff.server';

export const metadata: Metadata = { title: 'Configurações · Administração' };

export default async function SettingsPage({ params }: { params: Promise<{ restaurantSlug: string }> }) {
  const d = await staffRpc<ComponentProps<typeof SettingsForm>['settings']>('staff_get_settings', { p_restaurant_slug: (await params).restaurantSlug });
  return <SettingsForm key={d.version} settings={d} />;
}
