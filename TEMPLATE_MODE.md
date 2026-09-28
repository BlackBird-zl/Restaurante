# Modo Template (sem Supabase)

Esta variante foi simplificada para uso comercial como template e showcase.

## Decisão
A presença pública não depende mais de Supabase para resolver tenant, conteúdo, carta ou mesas. O host raiz abre Pátio do Ferro diretamente e os dados vêm de fixtures locais.

## Reservas
O formulário continua demonstrável, mas gera apenas uma referência `DEMO-*`. Nada é persistido ou enviado externamente.

## Mesa
As páginas de mesa continuam disponíveis para apresentar UX e carta, em modo somente leitura. Autorização QR, pedidos persistentes e conta real exigem uma camada de backend e ficaram fora do caminho crítico do template.

## Evolução futura
A arquitetura anterior de Supabase foi preservada no repositório para poder ser reativada quando existir um cliente/piloto que justifique persistência real.
