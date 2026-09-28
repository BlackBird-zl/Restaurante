import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { readTenantHeaders } from '@/modules/tenancy/context.server';

const Body = z.strictObject({
  name: z.string().trim().min(2).max(80), email: z.email().max(160).optional(), phone: z.string().trim().max(20).optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), time: z.string().regex(/^\d{2}:\d{2}$/), partySize: z.number().int().min(1).max(12),
  note: z.string().trim().max(300).optional(), website: z.string().max(200).optional(), elapsedMs: z.number().int().nonnegative().optional(),
});

export async function POST(req: NextRequest) {
  const ctx = await readTenantHeaders(req);
  if (!ctx) return NextResponse.json({ error: { code: 'NOT_FOUND' } }, { status: 404 });
  let json: unknown;
  try { json = await req.json(); } catch { return NextResponse.json({ error: { code: 'INVALID_INPUT' } }, { status: 400 }); }
  const parsed = Body.safeParse(json);
  if (!parsed.success || (!parsed.data.email && !parsed.data.phone)) {
    return NextResponse.json({ error: { code: 'INVALID_INPUT', message: 'Verifique os campos do formulário.' } }, { status: 400 });
  }
  const suffix = Math.random().toString(36).slice(2, 7).toUpperCase();
  return NextResponse.json({
    data: { reservation: { reference: `DEMO-${suffix}` } },
    meta: { mode: 'template-local', persisted: false, note: 'Demonstração local: nenhum dado foi enviado ou guardado.' },
  }, { status: 201 });
}
