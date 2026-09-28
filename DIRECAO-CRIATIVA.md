# Pátio do Ferro — direção criativa V3

Documento de referência completo: `uploads/PATIO_DO_FERRO_DIRECAO_CRIATIVA_V3_Claude.md`. A V2 foi arquivada em `v2/`.

## Conceito
**A mesma mesa, a noite inteira.** O visitante vê o serviço alterar um lugar que já conhece. A UI fica estável; a mudança está na imagem.

## Códigos aplicados
- **C1 Mesa de referência:** fotografias 4:3 retangulares, sem máscara nem filtro. IDs de produção T/S/P/B/G/M/E em `patio-media.js`.
- **C2 Régua de serviço:** 2 px de tinta, com uma interrupção de 32/16 px a 62,5%. Aparece uma vez por unidade principal: Home, Carta, Produto, Ambiente, Reservas e Contactos.
- **C3 Corte:** troca direta, com decode antes do commit e vitória do último pedido. Sem fade, zoom ou autoplay.
- **C5 Tipografia:** só Archivo; títulos com largura 85. Escalas conforme §4.2, com clamp entre breakpoints.
- **C6:** a UI não muda com o momento escolhido.
- **Cor:** canvas `#F1F2EE`, ink `#252B29`, muted `#59635E`, ember `#A13827` (só no indicador ativo e em erros), line `#B7BEB8` (só separadores).

## Ficheiros
- `carta-data.js`: 23 produtos em 6 capítulos, com `unidade`, `minimo`, `porcao`, `preparacao` e `media`. É a fonte única do horário.
- `patio-scenes.js`: 5 momentos da Home e 3 do Ambiente.
- `patio-media.js`: manifesto final de media; os 17 assets aprovados apontam para `assets/media/*.webp`.
- `patio-motion.js`: removido. O movimento limita-se a transições de 120 ms nas respostas e 160 ms na abertura do menu.

## Estado final desta entrega
- As 17 imagens V3 estão integradas localmente em `assets/media/`, sem hotlinks.
- T01–T05 usam a mesma mesa de referência e mantêm o enquadramento 4:3; a densidade e a luz mudam ao longo da noite.
- S01–S03 usam o mesmo quadro de Ambiente com três tratamentos horários.
- P01–P05, B01, G01, M01 e E01 estão ligados às páginas e fichas respetivas.
- O áudio de Ambiente permanece deliberadamente omitido: pela própria especificação, o componente só deve existir quando houver uma gravação real apropriada.
- Archivo continua carregado pelo Google Fonts para preservar a direção sem distribuir ficheiros de fonte dentro do pacote.
- A reserva continua como pré-visualização honesta, sem backend; morada, telefone e email são fictícios e estão identificados como demonstração.
