// Minimal local API gateway that plays the role Kong plays in `supabase start`:
// /auth/v1 -> Supabase Auth (GoTrue), /rest/v1 -> PostgREST, /storage/v1 -> Storage API.
// Realtime is not available without Docker in this environment; its route answers 503
// so the application exercises its documented polling fallback.
import http from 'node:http';

const PORT = Number(process.env.GATEWAY_PORT ?? 54321);
const routes = [
  { prefix: '/auth/v1', target: process.env.AUTH_URL ?? 'http://127.0.0.1:9999' },
  { prefix: '/rest/v1', target: process.env.REST_URL ?? 'http://127.0.0.1:54331' },
  { prefix: '/storage/v1', target: process.env.STORAGE_URL ?? 'http://127.0.0.1:54335' },
];

function cors(res, req) {
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin ?? '*');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Headers', 'authorization, x-client-info, apikey, content-type, prefer, range, accept-profile, content-profile, x-upsert, x-supabase-api-version');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD');
  res.setHeader('Access-Control-Expose-Headers', 'content-range, x-total-count');
}

const server = http.createServer((req, res) => {
  cors(res, req);
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }
  const url = req.url ?? '/';
  if (url.startsWith('/realtime/v1')) {
    res.writeHead(503, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ message: 'Realtime indisponível nesta stack local sem Docker' }));
    return;
  }
  const route = routes.find((r) => url === r.prefix || url.startsWith(r.prefix + '/') || url.startsWith(r.prefix + '?'));
  if (!route) { res.writeHead(404); res.end('not found'); return; }
  const target = new URL(route.target);
  const headers = { ...req.headers, host: target.host };
  // Kong behaviour: when only `apikey` is present, use it as bearer token.
  if (!headers.authorization && headers.apikey) headers.authorization = `Bearer ${headers.apikey}`;
  const upstream = http.request({
    hostname: target.hostname, port: target.port, method: req.method,
    path: url.slice(route.prefix.length) || '/', headers,
  }, (up) => {
    const h = { ...up.headers };
    delete h['access-control-allow-origin'];
    res.writeHead(up.statusCode ?? 502, h);
    up.pipe(res);
  });
  upstream.on('error', (e) => {
    if (!res.headersSent) res.writeHead(502, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ message: 'upstream error', detail: String(e.code ?? e) }));
  });
  req.pipe(upstream);
});

server.on('upgrade', (_req, socket) => {
  socket.end('HTTP/1.1 503 Service Unavailable\r\n\r\n');
});

server.listen(PORT, '127.0.0.1', () => console.log(`gateway on :${PORT}`));
