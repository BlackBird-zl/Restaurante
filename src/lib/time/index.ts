/** Time helpers. Tenant timezone is Europe/Lisbon in V1; business day starts at 05:00. */
export const TENANT_TZ = 'Europe/Lisbon';
export const BUSINESS_DAY_START_HOUR = 5;

function partsIn(date: Date, tz: string) {
  const f = new Intl.DateTimeFormat('en-GB', {
    timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
  });
  const p = Object.fromEntries(f.formatToParts(date).map((x) => [x.type, x.value]));
  return { y: Number(p.year), m: Number(p.month), d: Number(p.day), h: Number(p.hour), min: Number(p.minute), s: Number(p.second) };
}

/** Business date (YYYY-MM-DD) = local date of (timestamp in tz) minus start hour. Mirrors SQL. */
export function businessDate(date: Date, tz = TENANT_TZ, startHour = BUSINESS_DAY_START_HOUR): string {
  const p = partsIn(date, tz);
  const local = Date.UTC(p.y, p.m - 1, p.d, p.h, p.min, p.s) - startHour * 3_600_000;
  return new Date(local).toISOString().slice(0, 10);
}

export function formatTime(iso: string | Date, tz = TENANT_TZ): string {
  return new Intl.DateTimeFormat('pt-PT', { timeZone: tz, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(iso));
}

export function formatDate(iso: string | Date, tz = TENANT_TZ, opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long' }): string {
  return new Intl.DateTimeFormat('pt-PT', { timeZone: tz, ...opts }).format(new Date(iso));
}

export function formatDateTime(iso: string | Date, tz = TENANT_TZ): string {
  return new Intl.DateTimeFormat('pt-PT', { timeZone: tz, day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
    .format(new Date(iso));
}

/** Elapsed whole minutes between an ISO timestamp and a server-adjusted "now". */
export function elapsedMinutes(fromIso: string, nowMs: number): number {
  return Math.max(0, Math.floor((nowMs - new Date(fromIso).getTime()) / 60_000));
}

/** "há 3 min", "há 1 h 05" — compact operational durations. */
export function formatElapsed(fromIso: string, nowMs: number): string {
  const mins = elapsedMinutes(fromIso, nowMs);
  if (mins < 1) return 'agora';
  if (mins < 60) return `${mins} min`;
  return `${Math.floor(mins / 60)} h ${String(mins % 60).padStart(2, '0')}`;
}

export function formatDuration(seconds: number | null | undefined): string {
  if (seconds === null || seconds === undefined) return 'Sem dados';
  if (seconds < 60) return `${seconds} s`;
  const m = seconds / 60;
  return `${m.toLocaleString('pt-PT', { maximumFractionDigits: 1 })} min`;
}

export type WeeklyHours = Partial<Record<'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun', [string, string][]>>;
export const WEEKDAYS: { key: keyof WeeklyHours; label: string; short: string }[] = [
  { key: 'mon', label: 'Segunda-feira', short: 'Seg' }, { key: 'tue', label: 'Terça-feira', short: 'Ter' },
  { key: 'wed', label: 'Quarta-feira', short: 'Qua' }, { key: 'thu', label: 'Quinta-feira', short: 'Qui' },
  { key: 'fri', label: 'Sexta-feira', short: 'Sex' }, { key: 'sat', label: 'Sábado', short: 'Sáb' },
  { key: 'sun', label: 'Domingo', short: 'Dom' },
];

/** Groups consecutive days with identical windows: "Terça a sábado · 12:00–15:00 · 19:00–23:00". */
export function summarizeHours(hours: WeeklyHours): { days: string; windows: string }[] {
  const out: { days: string; windows: string }[] = [];
  let i = 0;
  while (i < WEEKDAYS.length) {
    const key = WEEKDAYS[i]!.key;
    const w = JSON.stringify(hours[key] ?? []);
    let j = i;
    while (j + 1 < WEEKDAYS.length && JSON.stringify(hours[WEEKDAYS[j + 1]!.key] ?? []) === w) j++;
    const label = i === j ? WEEKDAYS[i]!.label : `${WEEKDAYS[i]!.label.replace('-feira', '')} a ${WEEKDAYS[j]!.label.replace('-feira', '').toLowerCase()}`;
    const windows = (hours[key] ?? []).map(([a, b]) => `${a}–${b}`).join(' · ');
    out.push({ days: label, windows: windows || 'Encerrado' });
    i = j + 1;
  }
  return out;
}

/** Local YYYY-MM-DD for "today" in the tenant timezone. */
export function localToday(now = new Date(), tz = TENANT_TZ): string {
  const p = partsIn(now, tz);
  return `${p.y}-${String(p.m).padStart(2, '0')}-${String(p.d).padStart(2, '0')}`;
}

export function weekdayKey(ymd: string): keyof WeeklyHours {
  const d = new Date(`${ymd}T12:00:00Z`).getUTCDay();
  return (['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const)[d]!;
}

/** Indicative reservation slots (:00/:30) inside published windows, ending 60 min before close. */
export function reservationSlots(hours: WeeklyHours, ymd: string): string[] {
  const windows = hours[weekdayKey(ymd)] ?? [];
  const slots: string[] = [];
  for (const [a, b] of windows) {
    const [ah, am] = a.split(':').map(Number) as [number, number];
    const [bh, bm] = b.split(':').map(Number) as [number, number];
    for (let t = ah * 60 + am; t <= bh * 60 + bm - 60; t += 30) {
      slots.push(`${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`);
    }
  }
  return slots;
}
