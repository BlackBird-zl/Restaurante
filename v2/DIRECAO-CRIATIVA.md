# Pátio do Ferro — direção criativa

## Ideia central
**O site conta uma noite na casa, das 19h à meia-noite.** A assinatura "A mesa pede tempo." não é um slogan: é o que organiza o site. A Home avança por horas (19h30 a brasa acende · 20h40 chega à mesa · 22h30 ainda estamos cá), e o Ambiente é uma sequência de fotos com a hora a que foram tiradas. Quem visita segue uma noite do princípio ao fim antes de ver um único preço.

## Linguagem visual
- **Arco = porta/janela da casa.** Aparece nas imagens de abertura (Home, Produto, Reservas, capítulo Da brasa). É a forma que convida a entrar.
- **Círculo = prato visto de cima.** Aparece nos materiais, nos detalhes dos pratos, nas pessoas e nas imagens metidas dentro das frases.
- **Tipografia como arquitetura:** Caprasimo em escala extrema (até 232px), linhas desencontradas e sobrepostas às fotos. Figtree para a leitura. A hierarquia vem do contraste entre as palavras muito grandes e as etiquetas pequenas em caixa alta.
- **Cor por materiais:** cal (fundo creme), barro/brasa (terracota), verde seco (sálvia, na reserva e no convite) e tinta/ferro (neutral-900, na brasa e no rodapé).
- **Fotografia lavada (`.washed`)**, para as fotos se fundirem com o papel. Cada espaço de imagem traz na legenda a direção fotográfica.

## Padrões removidos
Hero com o texto à esquerda e a imagem à direita · CTA logo no hero · grelhas de cards · ícones genéricos · secções com fundo alternado · carrossel · cards de menu · blocos "Sobre / Ambiente / Destaques".

## Como vende hospitalidade
- Horas, nomes e mesas ("Mesa 7, sexta-feira, 20h41") em vez de adjetivos.
- As pessoas da casa (brasa, sala, horta) e os oito materiais aparecem antes da comida.
- Pormenores de acolhimento: luz, som, crianças e cães, acessibilidade, lugares guardados ao balcão para quem chega sem reserva.
- A reserva escreve-se como uma frase ("Somos 2, sexta, e gostávamos de ficar ao balcão da brasa") e termina com um "Até sexta, Ana.".

## Páginas (rotas)
`Home` · `Carta` (capítulos I–VI, índice fixo, filtro sem carne nem peixe) · `Produto?p=slug` · `Sobre` · `Ambiente` · `Reservas?n=&d=&e=` · `Contactos`.
Os dados ficam em `carta-data.js` (`window.PATIO`), com as mesmas categorias → itens → slug.
O movimento está em `patio-motion.js`: revelações lentas, que respeitam `prefers-reduced-motion` e podem ser desligadas nos Tweaks.

## Mídia final em falta
Todas as imagens são espaços para arrastar e largar, cada um com a direção fotográfica na legenda. Prioridade: sala ao anoitecer (entrada), brasa, mesa vista de cima, fim de noite, fachada, os três retratos, a porta à noite e os 5 pratos em destaque.
