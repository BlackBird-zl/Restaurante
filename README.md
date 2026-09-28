# Miolo — V2.1 (enriquecimento fotográfico)

Esta versão mantém a direção V2: pilha de camadas, tipografia, paleta, interações e estrutura comercial.
Abrir `index.html` servindo a pasta (`python3 -m http.server`). O código-fonte está em `src/template.html`; `build.py` gera o `index.html`, expandindo os marcadores `{{PIC …}}` em `<picture>` com AVIF, WebP e `srcset`.

## Imagens: onde entrou cada uma

| Família | Ficheiro | Uso |
|---|---|---|
| A · Wide com espaço para texto (claro) | `hero` / `hero-m` | Hero. No computador, a tipografia fica à esquerda; no telemóvel há um recorte próprio com o hambúrguer inteiro e o título por cima, fora da comida |
| A · Wide noturno | `cta` / `cta-m` | CTA final antes do rodapé, com o estado aberto/fechado |
| B · Produto frontal, estúdio | `sc-estudio` | Atmosfera Estúdio e base das 7 faixas da anatomia |
| C · Janela | `sc-janela` | Atmosfera Janela |
| D · Balcão com candeeiros | `sc-balcao` | Atmosfera Balcão (madeira, contexto de serviço, 19h30) |
| D · Noite com bokeh | `sc-noite` | Atmosfera Noite |
| E · Macros | `lupa-*` (7 recortes) | "Lupa" da anatomia: cada camada mostra o seu grande plano |
| E · Macros | `perto-drip`, `perto-topo`, `perto-faixa` | Sequência "Ao perto" (horizontal grande, vertical, faixa panorâmica) |
| F · Cortado | `cortado` | Nova secção "Por dentro" |
| G · Mãos | `maos` | Nova secção "Montado à mão", antes da Carta |
| G · Mãos na tábua | `tabua` | Faixa por cima do formulário de encomenda |
| H · 3/4 sobre papel | `mesa` | Destaque do Clássico na Carta |

Ordem da Home: hero → manifesto → quatro atmosferas → anatomia com lupa → ao perto → por dentro → montado à mão → carta → encomenda → CTA final → horário.

## Problemas encontrados e corrigidos
- Auditoria: as 9 imagens da V2 (hero com fundo estendido, 4 cenas e 4 recortes com 480 px) foram todas substituídas. Nenhuma ficou no projeto.
- Cenas repetiam o mesmo tipo de fundo claro; agora Balcão e Noite têm fotografias próprias, de madeira e bokeh, e a paleta do palco acompanha cada uma.
- Os grandes planos da V2 eram recortes de 480 px. Os novos recortes da lupa têm 700–800 px e aparecem a 300–360 px CSS (cerca de 2× em retina).
- A primeira atmosfera fazia um pedido de imagem imediato; agora respeita o carregamento lazy.
- No telemóvel, a sequência "Ao perto" deixava um buraco ao lado da imagem vertical; os números passam para esse espaço.
- A ordem da sequência editorial no computador deixava espaço vazio; a grelha foi fixada em 3 linhas.

## Performance
- AVIF com WebP como alternativa, 2 larguras por imagem (nativa e cerca de 60 %), `srcset` e `sizes`, `width`/`height` em todas as imagens.
- Preload só do hero (AVIF, uma versão para computador e outra para telemóvel), com `fetchpriority="high"`.
- Tudo o resto em `loading="lazy"`. As outras atmosferas e os grandes planos da lupa só são pré-carregados quando a secção se aproxima.
- Primeira visita a 1440 px: 4 pedidos de imagem (hero, a primeira atmosfera, que o Chromium antecipa, e as 2 miniaturas do manifesto).
- Nenhuma imagem é ampliada via CSS: medido no browser, a largura mostrada fica sempre abaixo da resolução servida.

## Testes
- Chromium (Playwright) a 1440×900 e 390×844 (2×): sem erros de JavaScript e sem deslocamento horizontal.
- Os 4 estados das atmosferas, a lupa da anatomia (camada Carne), a carta, a encomenda e o hero AVIF no telemóvel (`hero-m-1072.avif`) foram verificados.
- A versão de ficheiro único abre por `file://` (só WebP na largura máxima, sem `srcset`).
- Não testado: fontes do Google (bloqueadas no ambiente de teste), Safari e dispositivos reais.
