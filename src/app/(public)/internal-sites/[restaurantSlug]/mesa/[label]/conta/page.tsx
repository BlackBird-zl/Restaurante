import { redirect } from 'next/navigation';
import { BillView } from '@/components/table/TableViews';
import { getPublicContext } from '@/modules/tenancy/context.server';
import { getTableState } from '@/modules/tables/state.server';

type Props = { params: Promise<{ restaurantSlug: string; label: string }> };

export default async function Page({ params }: Props) {
  const p = await params;
  const ctx = await getPublicContext(p.restaurantSlug);
  const state = await getTableState(ctx, p.label);
  if (state.mode !== 'session') redirect(`${ctx.basePath}/mesa/${state.label.toLowerCase()}`);
  return <BillView />;
}
