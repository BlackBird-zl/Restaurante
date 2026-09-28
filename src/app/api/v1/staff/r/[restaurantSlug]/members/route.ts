import { z } from 'zod';
import { call, staffHandler } from '@/modules/auth/staff-route.server';
import { sendInvitation } from '@/modules/auth/invite.server';

const Body = z.strictObject({
  email: z.email().max(160), displayName: z.string().trim().min(1).max(80),
  roles: z.array(z.enum(['admin', 'floor', 'kitchen', 'bar', 'cashier'])).min(1).max(5),
  stationIds: z.array(z.uuid()).max(10).default([]),
});

export const GET = staffHandler({ run: ({ client, slug }) => call(client, 'staff_admin_members', { p_restaurant_slug: slug }) });

/** Creates an `invited` membership (RPC authorizes admin/owner) and then asks Auth to send the invitation. */
export const POST = staffHandler({
  mutation: true, status: 201, body: Body,
  run: async ({ client, slug, key, req }, b) => {
    const r = await call<{ member: { id: string } }>(client, 'staff_invite_member', {
      p_restaurant_slug: slug, p_email: b.email.toLowerCase(), p_display_name: b.displayName, p_roles: b.roles, p_station_ids: b.stationIds, p_idempotency_key: key,
    });
    const delivery = await sendInvitation(b.email.toLowerCase(), req);
    return { ...r, delivery };
  },
});
