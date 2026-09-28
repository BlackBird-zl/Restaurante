/** Only internal, allowlisted return paths are accepted after login/callback. */
export function safeNext(next: string | null | undefined, fallback = '/restaurantes'): string {
  if (!next) return fallback;
  if (!next.startsWith('/') || next.startsWith('//') || next.includes('\\') || /[\r\n]/.test(next)) return fallback;
  if (/^\/(r\/[a-z0-9-]+(\/[A-Za-z0-9\-/]*)?|restaurantes|definir-palavra-passe)(\?[^#]*)?$/.test(next)) return next;
  return fallback;
}
