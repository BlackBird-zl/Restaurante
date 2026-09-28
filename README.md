# Miolo — site multipágina

Site estático, sem framework. Seis páginas com URLs limpas, com cabeçalho, rodapé, dados, CSS e JS partilhados.

## Estrutura
```
src/
  pages/        home, classico, atmosferas, carta, encomendar, casa (.html, com metadados no topo)
  partials/     header.html, footer.html (um só cabeçalho e rodapé para todas as páginas)
  assets/css/   miolo.css (sistema partilhado) + uma folha por página
  assets/js/    data.js (carta, camadas, cenas, horário), miolo.js (cabeçalho, menu, carrinho), um script por página
  assets/img/   AVIF + WebP em 2 larguras, meta.json com dimensões
build.py        gera dist/ (deploy) e dist-artifact/ (pré-visualização)
dist/           site pronto: /, /o-classico/, /atmosferas/, /carta/, /encomendar/, /casa/ + vercel.json
```
Para gerar: `python3 build.py`. Para testar: `cd dist && python3 -m http.server`.
Para publicar na Vercel ou em qualquer alojamento estático, usar a pasta `dist/` como raiz. Cada rota é uma pasta com `index.html`, por isso o acesso direto e o refresh funcionam sem regras de reescrita.

## Páginas
| URL | Página | Papel |
|---|---|---|
| `/` | Home | Campanha: hero, manifesto, pré-visualizações de cada capítulo, fecho |
| `/o-classico/` | O Clássico | Produto: inteiro → camadas com lupa → ao perto → por dentro → nas mãos |
| `/atmosferas/` | Atmosferas | Luz: quatro cenas numa linha do dia, com ficha, temperatura de cor e endereço partilhável (`#estudio`, `#janela`, `#balcao`, `#noite`) |
| `/carta/` | Carta | Escolha: Clássico em destaque, lista editorial, categorias fixas, controlo de quantidade em cada linha |
| `/encomendar/` | Encomendar | Ação: pedido, hora, nome, com o talão como protagonista |
| `/casa/` | A Casa | Lugar: almoço e jantar com fotografia, semana completa, morada e contacto |

## Carrinho
Guardado em `localStorage` (`miolo-encomenda-v1`); se o navegador bloquear o armazenamento, fica em memória. O contador do cabeçalho, a Carta e Encomendar leem sempre dessa fonte, e o carrinho fica sincronizado entre separadores. Nenhuma página depende da Home.

## Removido
Estado aberto/fechado ("A verificar horário…", "Abre amanhã", indicador verde), no cabeçalho e no fecho, e o respetivo JavaScript. O horário semanal fica em A Casa; a hora de Lisboa só serve para assinalar o dia na tabela e para propor horas de recolha.
