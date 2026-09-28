# Changelog

## 0.1.0 — 2026-09-28 (V1)

- Plataforma multi‑tenant por host com site público editorial (3 presets), carta, reservas com confirmação humana.
- Mesa por QR + código de 6 dígitos, sessões de convidado, carrinho, pedidos transacionais e idempotentes.
- KDS cozinha/bar, salão (entregas, chamados, pedido assistido), caixa com registo de pagamento externo e fecho atómico.
- Backoffice: carta, categorias, estações, mesas/QR (impressão e rotação), equipa, pedidos, chamados, contas,
  reservas, site e marca (rascunho/publicação, tema, media com upload validado), configurações, analytics.
- Segurança: schema privado, RPCs com verificação de papel/tenant, FKs compostas, RLS nas invalidações,
  rate limits, CSP com nonce.
- Demo Pátio do Ferro + Balcão do Largo, seed determinístico e reset protegido.
- Testes: unitários, pgTAP, integração HTTP, E2E multi‑contexto, carga reduzida. Ver QA_REPORT.md.
- Pendente: fotografias (placeholders identificados), validação em staging e Realtime por WebSocket.
