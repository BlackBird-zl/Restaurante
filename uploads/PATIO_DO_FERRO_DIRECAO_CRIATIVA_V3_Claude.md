# Pátio do Ferro — Direção criativa V3

## A mesma mesa, a noite inteira

**Documento de decisão e execução para Claude · 28 de setembro de 2026**  
**Assinatura preservada:** “A mesa pede tempo.”  
**Entrega desta etapa:** crítica da proposta V2 e especificação da V3. Nenhum site ou imagem foi produzido nesta etapa.

> A V3 deve permitir reconhecer a casa pelo modo como a mesa aparece, permanece e é usada. O nome confirma a identidade; não deve ser a única coisa que a cria.

## 0. Como utilizar este documento

Este documento governa a próxima revisão da **experiência pública** do Pátio do Ferro: Home, Carta, Produto, Ambiente, Reservas, Sobre, Contactos, navegação e rodapé. É uma direção única, com escolhas fechadas. Não é um catálogo de estilos para o implementador combinar.

A camada conceitual da V2 permanece: acompanhar uma noite, organizar a carta por capítulos e tratar a reserva como um gesto de acolhimento. A gramática visual Organic é substituída. “Deixar mais sofisticado” o mesmo sistema não satisfaz esta direção.

A implementação deve preservar as rotas, os dados e os comportamentos úteis que já existem. No pacote analisado, a carta tem **23 produtos em seis capítulos**, guardados em `carta-data.js`; o protótipo declara modo local, sem Supabase. Esta revisão não autoriza migrar a stack, acrescentar pedidos, pagamentos, CRM, 3D ou um novo backend. Os documentos anteriores do SaaS continuam a tratar da operação; este documento substitui a direção pública anterior onde houver conflito visual. Não recuperar automaticamente o antigo catálogo de demonstração.

Ordem de prevalência: honestidade funcional e acessibilidade → dados e contratos existentes → códigos visuais da V3 → detalhe decorativo. Uma metáfora que impede ler o preço ou concluir uma reserva deve ser simplificada.

**Percurso de leitura:** crítica e conceito nas secções 1–3; regras e páginas nas secções 4–12; fotografia e adaptação nas secções 13–14; alterações, execução e aceite nas secções 15–18.

### Base efetivamente examinada

Foram examinados `DIRECAO-CRIATIVA.md`, as páginas `.dc.html`, `SiteHeader`, `SiteFooter`, `carta-data.js`, `patio-motion.js` e o sistema `_ds/organic-…`, além da miniatura exportada. A análise é de código, estrutura, estilos e direção de conteúdo. Não equivale a uma auditoria funcional completa em browser.

O pacote contém **espaços de imagem e instruções fotográficas, sem as fotografias finais**. Portanto, as observações sobre fotografia referem-se às máscaras, filtros e instruções previstas. Não afirmam que imagens ainda inexistentes têm defeitos visuais concretos.

O restaurante é uma proposta fictícia. Morada, telefone, equipa, proveniências e histórias do pacote não são evidências de uma casa real. A especificidade da V3 será construída com decisões formais e cenas coerentes, sem apresentar ficção como documentação histórica.

---

## 1. Diagnóstico: o conceito avançou mais do que a linguagem

**Na proposta atual, a resposta à pergunta “sem o nome ainda reconheceríamos a casa?” é: ainda não há evidência suficiente.** Reconhece-se com facilidade uma família de hospitality contemporâneo. Os elementos que permitiriam reconhecer especificamente esta casa ainda não operam como sistema.

A razão é verificável. O `readme.md` do sistema Organic já prescreve, antes de qualquer particularidade do restaurante, creme, terracota, verde seco, Caprasimo, Figtree, círculos, formas arredondadas, assimetria e imagens lavadas. O documento também desaconselha cantos retos e outras famílias tipográficas. A V2 conta uma história própria dentro de uma gramática emprestada quase integralmente.

Não é necessário provar que um recurso “está na moda” por estatística de tendências para identificar o problema. Aqui, o sinal relevante é a sua **independência em relação à marca**: trocar a casa por um wine bar, uma padaria ou um hotel não exigiria mudar esses recursos. São convenções disponíveis, não consequências inevitáveis do Pátio do Ferro.

### 1.1 O que já funciona — e por quê

| Elemento | Valor que deve permanecer | Limite a corrigir |
|---|---|---|
| Uma noite como estrutura | Dá duração à hospitalidade e articula as páginas | A passagem do tempo precisa aparecer nas relações entre imagens, não só nas horas escritas |
| “A mesa pede tempo.” | Junta serviço, partilha e permanência numa frase simples | Não usar a frase para justificar demora da interface ou esconder preços |
| Carta em seis capítulos | É legível, útil e tem uma voz editorial compatível com a casa | Reduzir a teatralidade dos títulos e dar prioridade a prato, porção e preço |
| Pessoas e trabalho antes da ostentação gastronómica | Apresenta a casa como prática coletiva | Mostrar gestos e efeitos do serviço; evitar biografias e citações inventadas como prova |
| Informações de acolhimento | Luz, ruído, acesso e condições da reserva ajudam a decidir | Publicar apenas condições verificadas ou claramente demonstrativas |
| Reserva com linguagem corrente | Pode reduzir a distância entre pessoa e estabelecimento | A frase não substitui labels, validação nem confirmação real |
| Dados da carta separados da apresentação | Permite preservar o produto durante a mudança visual | Eliminar os fallbacks que inventam origem, tempo de preparação ou prato inexistente |
| Atenção a `prefers-reduced-motion` | Já existe uma intenção correta de acessibilidade | A experiência sem movimento precisa continuar completa e reconhecível |

### 1.2 Onde a identidade se dissolve

| Decisão atual | Diagnóstico | Decisão V3 |
|---|---|---|
| Arco = porta; círculo = prato | A associação é compreensível, mas aplica-se a quase qualquer restaurante. A máscara não documenta uma porta concreta nem um prato concreto | Fotografias retangulares integrais. A assinatura vem da repetição de uma posição e de um detalhe material específico |
| Caprasimo até 232 px na Home e 260 px na Carta | O gesto tipográfico domina todas as casas às quais for aplicado. Diminui a diferença entre páginas e empurra informação útil | Uma família funcional, títulos limitados e hierarquia pelo alinhamento e pelo papel da informação |
| Creme, terracota e verde seco | Cada cor recebe uma explicação material depois de escolhida; a combinação já pertence ao sistema Organic | Um campo mineral neutro, tinta escura e um sinal brasa pequeno. A comida e a luz fornecem a maior parte da cor |
| `.washed`: saturação 0,6, contraste 0,85 e brilho 1,1 | Faz fotografias diferentes parecerem parte do template à custa de comida, materiais e luz | Sem filtro global. Coerência produzida na captura, continuidade e tratamento individual |
| Fotografias com formatos e posições sempre diferentes | Cria novidade de composição, mas impede comparar momentos | Um enquadramento estável na sequência principal; diferenças causadas pelo serviço |
| Círculos de materiais e imagens dentro de frases | Tornam matéria concreta em decoração intercambiável | A matéria aparece em uso: junta, apoio, marca, superfície e gesto |
| Grandes blocos e colagens sobrepostos | A composição diz “editorial de restaurante” antes de dizer “esta mesa” | Uma cena principal persistente e áreas auxiliares de informação claramente subordinadas |
| Revelações de até 2,4 segundos | A lentidão é aplicada indiscriminadamente, sem relação com o gesto mostrado | Corte entre estados; feedback rápido; nenhuma espera imposta à leitura |
| Ambiente com seis horas e seis enquadramentos | Mostra variedade de fotografias, mas oferece pouca prova visual de transformação | Comparação do mesmo lugar em mais de uma hora; continuidade espacial observável |
| “Quem visita segue uma noite… antes de ver um único preço” | Confunde condução narrativa com controle do visitante | Carta e Reservas sempre acessíveis. A pessoa pode saltar a narrativa inteira |
| “Ninguém se queixou até hoje” sobre a espera | Pode soar defensivo ou condescendente; não explica o serviço | Informar uma duração verificada com neutralidade e oferecer uma escolha |
| Horários indisponíveis calculados artificialmente e “Mesa guardada” sem envio | Simula escassez e um compromisso que o protótipo não realizou | Estados verdadeiros de pré-visualização, pedido recebido e confirmação, conforme capacidade real |

### 1.3 A oportunidade específica

“Pátio”, “ferro”, “brasa”, “mesa”, “tempo” e “bairro” não precisam de seis ilustrações. Precisam de relações:

- O **pátio** faz a luz exterior chegar ao mesmo lugar e deixa a noite tornar-se visível.
- O **ferro** sustenta, junta e delimita. Não precisa de ferrugem desenhada nem de tipografia industrial.
- A **brasa** transforma o alimento. Aparece no tostado, no intervalo entre preparações e no trabalho; não colore toda a interface de laranja.
- A **mesa** recebe o resultado e conserva vestígios. É o ponto de vista que permanece.
- O **tempo** torna-se diferença entre estados comparáveis, não uma animação mais lenta.
- O **bairro** entra no modo de chegar, nos sons e nas relações verificáveis da casa, não em fotografias turísticas ou numa falsa história de oficina.

---

## 2. Conceito final: a mesma mesa, a noite inteira

A casa será apresentada a partir de uma mesa recorrente. O visitante não acompanha uma câmera que procura o próximo ângulo bonito. Vê o serviço alterar um lugar que já conhece.

A mesa começa preparada. O pão é partido. Uma travessa chega ao centro. Os lugares deixam de ser simétricos. Alguns pratos saem; ficam copos, migalhas e uma marca de água. O interesse não depende de empilhar mais elementos: no final, a retirada também conta a história.

A interface acompanha essa lógica: um campo constante, uma margem destinada ao serviço e mudanças localizadas. O conteúdo muda; a orientação fica.

**Promessa de experiência:** “Pode ficar a observar. Pode ir diretamente ao que precisa.” Essa frase é uma regra interna de design, não mais um slogan a colocar na Home.

### 2.1 Hipóteses testadas e decisão

| Hipótese | O que oferece | Onde falha | Decisão |
|---|---|---|---|
| O site é uma mesa que vai sendo posta | Cria continuidade, materialidade e memória visual | Em 3D, com pratos arrastáveis ou objetos clicáveis, pode virar jogo; um prato que permanece após visitar Produto parece ter sido adicionado a um pedido | **Adotar a lógica de composição e continuidade; rejeitar a simulação física e o carrinho implícito** |
| O tempo altera toda a interface | Pode tornar a noite sensível | Mudar o fundo segundo a hora real, reduzir contraste ou atrasar respostas penaliza quem está a usar o site | **Alterar luz, ocupação e vestígios nas cenas; manter a UI estável** |
| Cada scroll é um momento da noite | Permite uma montagem contínua | Depende do tamanho do ecrã, cria zonas vazias e pode sequestrar a navegação | **Não usar scroll obrigatório para avançar a história. A sequência é manual, tem cinco estados e cabe numa única área** |
| Ferro deve gerar o desenho | Oferece junta, apoio, corte e intervalo como regras | Ferrugem, rebites, stencil e fundos metálicos tornam a casa num cliché industrial | **Usar uma junta gráfica discreta e alinhamentos; ferro real apenas na fotografia** |
| Som torna o lugar presente | Revela escala, atividade e trabalho invisíveis | Autoplay, música de ambiente e efeitos em botões invadem o contexto de quem visita | **Um único excerto opcional em Ambiente, iniciado pela pessoa** |
| “Bairro” exige história e personagens | Pode dar espessura cultural | Personagens, arquivos e datas inventados produzem autenticidade falsa | **Mostrar práticas e informações verdadeiras; ficção explicitamente demonstrativa no template** |

### 2.2 O que torna isto hospitality e experiência cultural

O objeto de atenção deixa de ser apenas o prato acabado. Inclui preparar, servir, repartir, recolher e voltar a preparar. A mesma mesa torna visível que outras pessoas sustentam a experiência.

O site não vira museu, manifesto sobre a lentidão ou galeria de imagens inacessível. Uma sequência curta permite observar os gestos; a carta, os preços e a reserva permitem participar. O detalhe cultural está na forma de receber e na observação do quotidiano, não na quantidade de prosa.

**Regra editorial:** cada afirmação sobre a casa deve corresponder a algo que se pode ver, utilizar ou verificar. Uma frase que serviria intacta para vinte restaurantes deve ser cortada ou tornada concreta.

---

## 3. Sistema de códigos próprios

“Próprio” significa aqui um conjunto reconhecível e consistente para esta direção. Não é uma alegação de exclusividade legal, nem a afirmação de que uma linha ou um tipo de letra nunca foi usado por outra marca. A força está na combinação e na repetição disciplinada.

### C1 — A mesa de referência

**Decisão.** Criar uma única mesa de referência para a produção visual: tampo retangular de madeira castanha mate, duas peças com comprimentos na razão **5:3** e profundidade igual, unidas por uma junta transversal estreita de ferro escurecido, nivelada com a madeira. Sem ferrugem e sem ornamento. A junta fica a 62,5% do comprimento do tampo, medido da esquerda para a direita no enquadramento superior.

A razão 5:3 é uma escolha de desenho, não uma proporção mágica descoberta na marca. Torna-se código por repetição e correspondência material. É uma decisão de direção de arte para a casa fictícia, não a descrição de um móvel comprovadamente existente. Antes de uso comercial por uma casa real, fotografar a sua mesa ou produzir o elemento físico correspondente. Não dizer que veio de uma oficina, adega ou serralheiro específico sem confirmação.

**Por que existe.** O corte desigual permite reconhecer o suporte mesmo quando os pratos mudam. Une mesa e ferro através de uma construção, em vez de um símbolo aplicado.

**Home.** Cinco fotografias do mesmo tampo, com lente e posição fixas. A junta, os cantos e o veio da madeira permanecem alinhados.

**Carta.** Uma única imagem de contexto após a lista completa, usando essa mesa. As linhas de pratos não recebem textura de madeira nem miniaturas obrigatórias.

**Produto.** O prato é fotografado nessa mesa, com a junta presente numa lateral do enquadramento. A porção mantém prioridade e escala real.

**Ambiente.** O primeiro conjunto de imagens mostra onde essa mesa está na sala. O enquadramento da sala também se repete em horas diferentes.

**Reservas.** Um pequeno recorte da mesa preparada, com dois lugares, acolhe o formulário. Não muda para oito lugares quando alguém seleciona oito pessoas: seria uma promessa de configuração física não garantida.

**Mobile.** Na sequência principal, conservar o quadro 4:3 inteiro. Não trocar por um recorte vertical que elimina a junta e as referências.

**Não fazer.** Mesas diferentes por fotografia; madeira gerada como padrão de fundo; juntar ferro em todas as imagens; efeitos 3D; objetos arrastáveis; pretender que o tampo, isoladamente, já resolve toda a identidade.

### C2 — Margem de serviço com junta aberta

**Decisão.** Usar uma régua horizontal de 2 px, cor tinta, com uma interrupção de 32 px centrada a 62,5% da largura. Em ecrãs abaixo de 768 px, a interrupção mede 16 px. É uma tradução gráfica da junta, não uma imitação de material. A régua aparece **uma vez por unidade principal**: sob a cena da Home, sob a imagem principal de Produto, no cabeçalho da Carta, sob o comparador de Ambiente e antes do resumo da reserva.

O ponto de interrupção permanece fixo. Não corre, não pulsa, não funciona como barra de progresso. Tempo e seleção têm indicadores próprios, sempre acompanhados de texto.

**Por que existe.** Cria um ponto de reconhecimento que sobrevive sem fotografia. A interrupção evita que a linha se torne uma moldura fechada: a mesa tem uma margem por onde o serviço chega.

**Home.** À esquerda da régua, a legenda da cena. À direita, o estado atual e o controlo “Seguinte”. Nada flutua sobre a comida.

**Carta.** A régua separa título e índice do conteúdo. Dentro da lista, separadores comuns de 1 px; não repetir a assinatura 23 vezes.

**Produto.** Divide fotografia e informação de serviço. Preço, porção e preparação ficam em texto, sem cápsulas.

**Ambiente.** Separa imagem e hora selecionada. A posição da régua não muda quando a cena escurece.

**Reservas.** Antecede o resumo “2 pessoas · sexta, 16 de outubro · 20h00 · preferência: sala”, com valores efetivamente escolhidos.

**Mobile.** A mesma proporção; as duas áreas textuais podem passar a duas linhas. O corte nunca interrompe um texto ou uma área clicável.

**Não fazer.** Molduras de cantos, sublinhar todas as palavras, linhas em ziguezague, tracejado de talão, rebites, números de inventário, desenho de planta industrial ou animação de preenchimento.

### C3 — Corte no mesmo lugar

**Decisão.** A passagem entre momentos é um **corte direto entre fotografias alinhadas**. A mesa não anda; os objetos e a luz mudam. Não há dissolução que faça aparecer pratos fantasma, zoom ou morphing.

**Por que existe.** Só se reconhece o efeito do serviço porque o suporte permanece comparável. A operação cinematográfica tem uma razão concreta.

**Home.** Escolher um momento ou “Seguinte” muda a imagem, hora e legenda numa atualização única, depois de a imagem estar pronta. A ação não desloca a página.

**Carta.** O código aparece como estabilidade: abrir um capítulo não faz a lista deslizar lateralmente nem remontar preços. O índice leva a âncoras convencionais.

**Produto.** Se existir uma segunda fotografia de porção, a troca acontece na mesma área e sem movimento de câmera. Não exige uma galeria para cada item.

**Ambiente.** O comparador muda a hora mantendo posição, tamanho e ponto de vista. Não usar slider “antes/depois” que mistura duas horas na mesma fotografia.

**Reservas.** A submissão mantém o lugar do resumo e substitui apenas a região de estado. O site não faz desaparecer o formulário numa animação de cortina.

**Mobile.** Mesma troca, sem swipe obrigatório. Botões explícitos de pelo menos 48 px; swipe não será implementado na V3.

**Não fazer.** Automatizar a sequência, bloquear scroll, animar todas as entradas, fazer shared-element entre pratos diferentes, usar o corte como pretexto para flashes de branco.

### C4 — O que fica na mesa

**Decisão.** Cada fotografia herda pelo menos três referências identificáveis da anterior: duas materiais do suporte e, no mínimo, uma de serviço ou vestígio. No estado final, a marca de água no lugar do copo cumpre esta última função. Nem todos os objetos ficam no mesmo sítio: o serviço pode movê-los, mas a transformação deve ser explicável. Os vestígios acumulam-se com moderação e alguns desaparecem quando a mesa é recolhida.

**Por que existe.** Uma imagem de mesa perfeita comunica preparação; uma continuidade de marcas comunica presença. Esta memória visual distingue uma noite de cinco still lifes independentes.

**Home.** A dobra do guardanapo, um copo e a travessa têm trajetórias definidas no plano de produção. A última imagem conserva uma marca de água e migalhas plausíveis, sem encenar sujidade.

**Carta.** Uma nota de serviço por capítulo, quando útil, explica uma relação concreta: porção, partilha ou unidade de preço. A lista não regista ficticiamente o que o visitante “já provou”.

**Produto.** Uma fotografia secundária pode mostrar a primeira porção retirada, se ajudar a entender como se partilha. Não confundir prato servido com restos pouco apetecíveis.

**Ambiente.** Mostrar mesa antes e depois, incluindo recolha e preparação; a casa não termina quando deixa de haver clientes na fotografia.

**Reservas.** Preservar campos após erro e ao voltar de uma etapa. Aqui a memória é cuidado funcional, não migalhas decorativas no formulário.

**Mobile.** Nenhum destes sinais depende de hover, lente de aumento ou legenda minúscula.

**Não fazer.** Anéis de copo desenhados atrás dos textos, manchas CSS, partículas, objetos duplicados, clientes idênticos, converter um produto consultado num pedido ou fingir lembrar visitas sem necessidade.

### C5 — Dois registos de voz, uma só tipografia

**Decisão.** Uma família tipográfica, Archivo variável. O registo da casa usa frases curtas, caixa normal e títulos de escala contida; o registo de serviço usa corpo legível, números tabulares e alinhamentos consistentes. Não usar monoespaçada para “parecer sistema”.

**Por que existe.** A diferença entre convite e informação decorre da intenção e do ritmo de leitura, não da oposição previsível entre serif enorme e etiqueta minúscula.

**Home.** “A mesa pede tempo.” aparece uma vez, em até duas linhas. As horas não são maiores do que a ação de navegar. A legenda identifica uma mudança visível.

**Carta.** Nome, descrição e preço têm hierarquia direta. Capítulos não ocupam um ecrã antes de os produtos aparecerem.

**Produto.** Nome do prato e preço estão visíveis antes de qualquer texto sobre origem. Preparação e porção usam o mesmo vocabulário da Carta.

**Ambiente.** As legendas observam acontecimentos e espaços. Não declaram “fotografado sem poses” sem haver esse trabalho documental.

**Reservas.** A frase aproxima; labels e estados explicam. “Pedido recebido” não é substituído por uma frase calorosa que esconda a falta de confirmação.

**Mobile.** Corpo mínimo de 16 px, preferencialmente 18 px nos textos editoriais; controlos nunca dependem de etiquetas abaixo de 12 px.

**Não fazer.** Caprasimo, outra display serif equivalente, título de 20 vw, itálicos performativos, caixa alta em parágrafos, fontes stencil ou copy que manda o cliente “deixar o tempo lá fora”.

### C6 — A noite está na imagem

**Decisão.** Fundo e texto da UI não mudam com o momento. A noite aparece na queda da luz exterior, na proporção entre luz ambiente e luminárias, na ocupação e na quantidade de elementos em uso.

**Por que existe.** Torna a passagem do tempo observável sem sacrificar contraste, legibilidade ou orientação. Evita confundir uma narrativa editada com o estado real do restaurante.

**Home.** Cinco estados de uma noite ilustrativa de sexta ou sábado. Selecionar 23h50 não afirma que a casa esteja aberta agora.

**Carta.** A carta não esconde entradas depois das 21h nem muda preços segundo o momento escolhido. Horário real é informação separada.

**Produto.** A fotografia usa o momento apropriado para mostrar o alimento, com cor verdadeira. Não recebe uma camada laranja porque a Home está em 22h30.

**Ambiente.** A diferença de luz é o conteúdo da comparação. A UI de seleção permanece idêntica.

**Reservas.** A data da visita é uma escolha de formulário. Nunca sincronizar disponibilidade com a hora narrativa.

**Mobile.** Não consultar relógio, geolocalização, sensor de luz ou bateria para alterar o tema.

**Não fazer.** Dark mode narrativo, fundos que escurecem com o scroll, numerais em contagem, velas animadas ou filtros de “hora dourada” aplicados a fotos incompatíveis.

### C7 — Um lugar que se pode ouvir, quando se escolhe

**Decisão.** Ambiente pode conter um excerto de 18 segundos, sem loop, identificado como “Ouvir a sala · 18 s”. Só existe se houver um ficheiro apropriado. Não exibir um controlo sem áudio real.

**Por que existe.** Som comunica distância, ocupação e trabalho que uma fotografia não mostra. Um prato pousado, conversa indistinta e uma cadeira dão escala humana sem transformar o site numa trilha sonora.

**Home.** Não toca som. No último apoio editorial, pode haver um link textual para Ambiente com âncora no excerto.

**Carta e Produto.** Silêncio. Sem talheres ao clicar nem fogo ao abrir um prato da brasa.

**Ambiente.** Botões Reproduzir/Pausa, duração e descrição textual: “Conversa baixa, pratos a chegar, uma cadeira afastada.” Pausar ao sair da página ou ao ocultar a aba. Nunca retomar sozinho.

**Reservas.** Silêncio. O formulário não reproduz uma saudação ou som de confirmação.

**Mobile.** Reproduzir apenas por toque explícito; sem depender do hover. A navegação permanece totalmente utilizável sem áudio.

**Não fazer.** Música licenciada sem autorização, vozes inteligíveis de pessoas não consentidas, som sintético apresentado como gravação real, chuva/brasa genérica de biblioteca como identidade de uma sala que nunca foi gravada.

---

## 4. Sistema gráfico fechado

### 4.1 Cor

| Token | Valor | Uso |
|---|---|---|
| `canvas` | `#F1F2EE` | Fundo mineral constante da experiência pública |
| `ink` | `#252B29` | Texto principal, botões principais, régua de serviço |
| `muted` | `#59635E` | Informação secundária ainda plenamente legível |
| `ember` | `#A13827` | Pequeno indicador do momento ativo e erro acompanhado de texto |
| `line` | `#B7BEB8` | Separadores não essenciais; nunca texto nem único limite de um controlo |
| `white` | `#FFFFFF` | Texto sobre `ink`; superfície de campos quando necessário |

Contrastes calculados entre cores sólidas: `ink/canvas` ≈ 12,82:1; `muted/canvas` ≈ 5,54:1; `ember/canvas` ≈ 6,00:1. `line/canvas` ≈ 1,69:1, por isso `line` não comunica sozinha limites ou estados indispensáveis. Inputs e foco usam `muted` ou `ink`.

O sinal brasa ocupa áreas pequenas, não painéis inteiros. Não há verde seco de apoio, alternância sistemática creme/escuro, gradientes ou textura aplicada ao canvas. Este neutro sozinho também não é uma identidade: precisa da mesa, da junta e da montagem.

### 4.2 Tipografia e escala

Usar **Archivo variável**, com ficheiro servido localmente e licença preservada. A família disponibiliza eixos de largura e peso; ver fonte oficial no fim. Não substituir por uma fonte “parecida” escolhida pelo agente sem testar a mesma estrutura.

| Papel | Desktop ≥ 1024 px | Mobile < 768 px | Regras |
|---|---|---|---|
| Título Home | 64/66 px, peso 500, largura 85 | 38/40 px, peso 500, largura 85 | Máximo duas linhas; tracking −0,02 em |
| Título de página | 48/52 px, peso 500, largura 85 | 32/36 px | Sem sobrepor imagens |
| Título de capítulo | 28/32 px, peso 600, largura 95 | 25/30 px | Numeral auxiliar em 14 px, não um cartaz |
| Nome de prato em lista | 19/25 px, peso 600 | 18/24 px | Quebra livre; preço não é cortado |
| Texto editorial | 18/28 px, peso 400, largura 100 | 18/27 px | Linha entre 45 e 68 caracteres |
| Informação e formulário | 16/24 px | 16/24 px | Labels visíveis; não usar placeholder como label |
| Legenda e metadado | 13/19 px, peso 500 | 13/19 px | Nunca o único lugar de informação decisiva |
| Preço, hora, quantidade | 16/24 px, peso 500 | 16/24 px | Algarismos tabulares; unidade explicitada |

Entre 768 e 1023 px, títulos de página em 40/44 e Home em 48/50. O eixo de largura é estático; **não animar letras**. O corpo usa a largura normal. Se a fonte falhar, o fallback sem serifa deve manter leitura e permitir reflow sem cortar texto.

### 4.3 Espaço, limites e superfícies

- Contentor máximo: 1248 px. Margens laterais: 48 px em desktop, 32 px em tablet, 20 px em mobile; em 320 px de largura, 16 px.
- Escala de espaçamento: 4, 8, 12, 16, 24, 32, 48, 64 e 96 px. Intervalo entre grandes áreas: 64 px desktop, 40 px mobile. Não usar vazios de 100 vh como mecanismo narrativo.
- Imagens sem arredondamento e sem sombra. Controlos com raio máximo de 2 px. Não transformar toda a interface num conjunto de caixas contornadas.
- Botão principal: fundo `ink`, texto branco, altura mínima 48 px; largura ajustada ao conteúdo, ou total em formulário mobile. Secundário: texto e sublinhado ou contorno simples. Sem pills.
- Foco: contorno de 2 px, afastamento de 3 px, visível sobre fundo claro e escuro. Estado selecionado também tem texto e/ou traço; a cor não basta.
- Uma imagem dominante por área. Imagens secundárias só existem se acrescentarem informação; não preencher o espaço vazio por ansiedade compositiva.
- Nenhum título fica sobre fotografia. A legenda, a ação e a cena têm áreas próprias.

### 4.4 Navegação e orientação

Navegação global: **Carta · Ambiente · Sobre · Contactos · Reservas**. O nome da casa liga à Home. “Reservas” é a ação de maior destaque, mas “Carta” nunca fica escondida atrás da narrativa.

Desktop: header sticky de 64 px, fundo sólido, sem blur. Mobile: header de 64 px com “Pátio” a ligar à Home, links Carta e Reservas e botão Menu de 48 px. O nome acessível do link Home é “Pátio do Ferro”. Os quatro elementos cabem em 320 px; não abreviar Carta ou Reservas em ícones. O menu contém as restantes páginas e abre uma região de navegação acessível. Nas páginas longas Carta e Produto, a barra inferior especificada na secção mobile repete as ações essenciais para alcance com uma mão.

O índice da noite é **local à Home**, não uma navegação global com nomes poéticos. Visitantes não precisam descobrir que “Partilhar” significa Carta ou que “Ficar” significa Reserva.

Preservar as rotas do pacote na revisão do protótipo: `Home`, `Carta`, `Produto?p=slug`, `Ambiente`, `Reservas`, `Sobre`, `Contactos`. Numa aplicação já integrada, usar o router existente. Não introduzir rotas novas apenas por preferência do implementador.

---

## 5. Sistema de movimento e tempo

O movimento tem três operações permitidas. Todo o resto é estático por defeito.

| Operação | Gatilho | Comportamento | Duração |
|---|---|---|---|
| **Trocar** | Seleção explícita de momento ou imagem | Corte de imagem já descodificada; hora, legenda e indicador mudam juntos; contentor mantém dimensões | Corte sem animação; indicador pode transitar em 120 ms |
| **Responder** | Pressionar botão, selecionar filtro, validar campo | Mudança de cor/contorno; sem deslocar a geometria ou mover texto | 120 ms; nunca atrasar a ação para esperar o efeito |
| **Abrir** | Menu mobile ou detalhe expansível | Região aparece; opacidade de 0 a 1 e deslocamento máximo de 4 px, se não houver movimento reduzido | 160 ms, ease-out; foco segue o padrão acessível do componente |

Não usar animação de saída entre rotas. Não esperar 160 ms para iniciar navegação, envio ou consulta. Não animar altura de listas da carta. Evitar `transition: all`.

### 5.1 Regras da sequência temporal

1. A Home começa em 19h00 numa primeira visita, salvo ligação direta válida a outro momento.
2. Há cinco botões de momento com nomes e horas. Qualquer um pode ser escolhido imediatamente. Há Anterior e Seguinte; no último estado, Seguinte fica indisponível, sem regressar ao início automaticamente.
3. Não existe autoplay, avanço por scroll, contagem ou requisito de ver os estados anteriores.
4. Cada seleção válida atualiza um parâmetro local à Home, `momento=antes|pao|centro|ficar|depois`, usando substituição do histórico. Não criar cinco entradas no botão Voltar. Valor inválido cai em `antes`.
5. Não acrescentar esse parâmetro a Carta, Produto ou Reservas. O comportamento nativo de voltar pode restaurar a Home. Não é necessário persistir o momento em cookie ou perfil.
6. Imagem, legenda e controlos têm altura reservada. A legenda ocupa até três linhas mobile e duas desktop; os textos devem ser escritos para caber, sem truncagem. O título do bloco não salta.
7. Pré-carregar o estado seguinte após a imagem inicial. Uma seleção de imagem ainda não pronta mantém a anterior e mostra “A carregar este momento” apenas na região de estado, sem spinner a bloquear a página. Após falha, mostrar “Este momento não está disponível” e permitir escolher outro; não associar nova legenda à foto antiga.
8. Em cliques rápidos, vence a última seleção pedida. Uma resposta atrasada de imagem não pode repor o estado anterior.
9. Sem JavaScript, apresentar a primeira cena e ligações para uma sequência estática das cinco figuras na mesma página. Não ocultar conteúdo essencial por script.

### 5.2 Movimento reduzido, som e desempenho

Com `prefers-reduced-motion: reduce`, desligar todas as transições espaciais e de opacidade. Os cortes solicitados e os estados funcionais continuam a funcionar. A marca deve sobreviver por enquadramento, junta, tipografia e conteúdo.

O site não precisa de GSAP, WebGL, vídeo de fundo ou biblioteca de animação para esta direção. Não adicionar dependências apenas para produzir o corte. Fotografias responsivas, dimensões reservadas e ficheiros locais de fonte são suficientes para a linguagem proposta.

O som pertence exclusivamente ao componente opcional de Ambiente. Preferência de movimento reduzido não significa autorização de áudio: este continua sempre desligado até uma ação explícita.

## 6. Home: uma sequência num lugar, não cinco cenários empilhados

A Home deixa de exigir que cada momento tenha um layout novo. O centro é uma **sequência manual de cinco estados**, apresentada sempre no mesmo quadro. Tecnicamente, isto é um seletor de imagens e conteúdo; a autoria está na continuidade da mesa, na montagem e na disciplina gráfica, não na alegação de inventar um novo componente.

Não usar navegação automática, bolinhas, swipe obrigatório, setas sobre a fotografia ou um “carrossel de experiências” com imagens sem relação entre si.

### 6.1 Ordem e composição

| Ordem | Área | Conteúdo e comportamento |
|---|---|---|
| 1 | Header | Nome, Carta, Ambiente, Sobre, Contactos, Reservas. Acesso direto às tarefas |
| 2 | Abertura | H1 “A mesa pede tempo.”; linha de contexto “Uma noite no Pátio, das 19h à meia-noite.”; link discreto “Ir à carta” |
| 3 | Mesa | Uma fotografia 4:3; junta gráfica abaixo; legenda da cena; cinco momentos selecionáveis; Anterior/Seguinte |
| 4 | Carta em poucas linhas | Quatro entradas editoriais escolhidas explicitamente, com preço e unidade. Link para carta completa. Sem cards ou miniaturas por defeito |
| 5 | Informação de chegada | Próximo passo claro: Reservas, localização e horários reais do cadastro. Pequeno link “Ver a sala e o pátio” para Ambiente |
| 6 | Rodapé | Nome em escala normal, contactos verificados ou indicação demo, navegação essencial. Não repetir a assinatura em tamanho monumental |

A narrativa inteira está na área 3. As áreas seguintes servem a decisão de visita; não competem com mais uma história visual. A Home pode ser lida sem alterar um único momento.

**Desktop:** título e sequência partilham um contentor central; não colocar um bloco de copy à esquerda de uma foto à direita como hero convencional. O quadro tem largura máxima de 800 px. Em ecrãs com pelo menos 1024 × 740 px, limitar a altura do quadro à menor entre 600 px e a altura útil do ecrã menos 320 px, mantendo 4:3. A intenção é deixar título, cena e controlos próximos, sem impor uma página de altura fixa. Em janelas mais baixas, usar dimensão natural e scroll normal, nunca comprimir o texto.

**Mobile:** imagem com largura disponível e proporção 4:3, sem limite pela altura do viewport. Título, quadro, legenda e índice seguem em fluxo normal. Nada fica sticky dentro da sequência. A pessoa consegue rolar normalmente mesmo quando o dedo começa sobre a fotografia.

### 6.2 Os cinco estados

| ID / hora editorial | Nome no índice | O que muda no quadro | O que permanece | Legenda-base |
|---|---|---|---|---|
| `antes` · 19h00 | Antes | Dois lugares preparados; copos de água, guardanapo de linho; pequeno prato de pão ainda inteiro | Mesa, junta, direção da luz, dois lugares | “A mesa está pronta. A noite ainda não.” |
| `pao` · 19h40 | Pão | Pão partido; manteiga usada; copo ligeiramente deslocado; primeira mão termina de pousar um prato | Junta, prato de pão, guardanapo identificável | “Parte-se o pão. Começa-se por aqui.” |
| `centro` · 21h00 | Centro | Costeleta para dois numa travessa ao centro; uma primeira porção retirada; copos em uso | Mesa, prato de pão quase vazio, um copo e o guardanapo anterior | “A travessa fica ao centro. Cada um tira a sua parte.” |
| `ficar` · 22h30 | Ficar | Travessa recolhida; prato de sobremesa com última colherada; dois copos e guardanapo menos composto | Mesa, copos, percurso plausível do guardanapo | “A sobremesa acaba. A conversa continua.” |
| `depois` · 23h50 | Depois | Recolha terminada quase por completo; uma marca de água e poucas migalhas; pano de serviço numa borda | Mesmo tampo, junta e luz da luminária; marca herdada de um copo | “Saem os pratos. Ficam os sinais da noite.” |

A sequência representa uma noite de fim de semana, compatível com o horário de sexta/sábado do cadastro atual. **Não é um relógio ao vivo, nem a indicação de abertura em todos os dias da semana.** A data não é exibida como se fosse um registo documental de uma noite que realmente aconteceu.

As legendas são textos de direção para o tenant fictício. Se os objetos finais não corresponderem ao texto, alterar a legenda ou a fotografia antes da publicação; não preservar a frase à custa da coerência.

### 6.3 Densidade e ritmo sem truques de interface

No primeiro quadro, a maior parte da mesa está livre. No terceiro, o centro concentra a atividade. No quarto, os objetos afastam-se do centro e sobram intervalos. No quinto, a retirada volta a expor o suporte, agora com memória.

O número de colunas, o tamanho do título e a velocidade do botão não acompanham essa variação. **A densidade que muda é a da cena.** Esta decisão evita uma interface que muda de regras a cada momento.

Não adicionar balões informativos a cada objeto. Um único link contextual sob a legenda pode existir: em Centro, “Ver a costeleta”; em Ficar, “Ver as sobremesas”. Nos outros estados, não inventar links só para preencher o mesmo espaço. Reservar uma altura estável para essa linha; a legenda não salta.

### 6.4 Quatro linhas da carta na Home

Selecionar por slug, sem depender de “os primeiros quatro com destaque”:

| Produto | Preço exibido | Qualificação necessária |
|---|---|---|
| Polvo na brasa | 24 € | Usar a porção validada do cadastro; não presumir que partilha significa preço por pessoa |
| Costeleta de maronesa | 68 € | Cerca de 1 kg · para duas pessoas |
| Couve coração-de-boi tostada | 13 € | Vegetariano; não classificar como vegan |
| Pudim Abade de Priscos | 6,50 € | Uma porção; não classificar como vegetariano, pois a receita atual contém toucinho |

O preço não aparece apenas no hover. Em mobile, nome, preço e qualificação ficam juntos. Os quatro itens ligam a Produto; “Ver a carta completa” leva à lista integral.

---

## 7. Carta: uma carta para escolher e partilhar

Preservar os seis capítulos: **Para começar / Da brasa / Do mar / Da horta / Para ficar / Copos**. Não renomear tudo para tempos abstratos. “Às 21h” não substitui “Da brasa”.

### 7.1 Estrutura

1. Título “Carta” e uma frase de serviço curta.
2. Junta gráfica e índice dos seis capítulos.
3. Filtro “Sem carne nem peixe”, com estado ativo explícito e ação “Limpar filtro”.
4. Lista completa de produtos, capítulo a capítulo.
5. Uma fotografia de contexto da mesa ao centro e link para Reservas, depois da lista. Não interromper a decisão entre dois produtos com uma imagem de um ecrã inteiro.

Desktop: índice em coluna lateral de 200 px, sticky sob o header. Lista em largura restante, sem duas colunas concorrentes de produtos. Mobile: botão “Capítulos” abre uma lista vertical de seis âncoras com alvo de 48 px; exibe o capítulo atual, mas não obriga a deslizar uma faixa horizontal para descobrir categorias.

Âncoras usam deslocamento que compensa o header. Seleção não oculta os outros capítulos. Se um filtro deixar um capítulo vazio, não apresentar um título seguido de um grande espaço; ocultar esse bloco e retirar a respetiva âncora enquanto o filtro estiver ativo.

### 7.2 Uma linha de produto

Nome à esquerda; preço à direita. A descrição fica na linha seguinte, sob o nome. Porção ou unidade de cobrança fica junto do preço ou imediatamente abaixo dele. Área clicável inclui nome e descrição; o foco é visível. Não deslocar a linha 6 px no hover.

Preço por peso: **“52 €/kg”**, sem converter em preço fixo. Arroz de carabineiro: **“29 €/pessoa · mínimo 2”**. A informação “mínimo duas pessoas” não pode ficar apenas dentro de Produto.

As tags dietéticas vêm dos dados e de validação humana. O filtro “Sem carne nem peixe” deve considerar `vegetariano` ou `vegan` explicitamente declarados; não deduzir pela fotografia, pelo título ou pela ausência de uma palavra na descrição. Não alargar a promessa para “seguro para alérgicos”.

### 7.3 Relação com a mesa e com o tempo

A estrutura favorece escolher para o centro: porções, partilha e acompanhamentos são legíveis. Isto expressa a mesa sem representar todos os produtos como objetos espalhados.

Uma nota de preparação só aparece onde há informação validada. Preferir “Preparação aproximada: 40 min” a “Ninguém se queixou da espera”. Não exibir contagem regressiva ou “a cozinha está a preparar” numa página pública de descoberta.

Se um produto não estiver disponível, apresentar esse estado de forma factual e manter o preço quando isso for útil. Esta revisão visual não cria gestão de disponibilidade em tempo real que o protótipo não possui.

**Eliminar:** arcos por categoria, fotografias redondas, números romanos gigantes, manifesto entre listas, imagens escondidas no hover e a obrigação de atravessar a noite antes de ver preços.

---

## 8. Produto: o prato encontra a mesa

Produto deve responder primeiro a quatro perguntas: **o que é, quanto custa, que porção é e o que preciso saber para o escolher.** A narrativa aprofunda depois.

### 8.1 Hierarquia e layout

1. Breadcrumb: Carta → capítulo → prato; voltar à Carta conserva o contexto quando possível.
2. Nome do prato, preço com unidade e porção. Esta área precede a imagem em ordem de leitura e em mobile.
3. Fotografia principal retangular 4:3, sem arco, sobre a mesa de referência.
4. Junta gráfica e linha de serviço: preparação aproximada, quando validada; possibilidade de partilha; informação dietética conhecida.
5. Descrição curta de confeção. Ingredientes em texto simples, sem coleção de pills.
6. Uma segunda fotografia apenas se mostrar uma informação diferente: porção retirada, interior ou forma de servir. Sem círculos de ingredientes crus como decoração.
7. Sugestão de acompanhamento proveniente do campo `par`, quando existir e apontar para um produto válido. Nome e preço presentes. Link “Ver na carta”.
8. Ações: “Voltar à carta” e “Pedir reserva”. Nenhum “Adicionar à mesa” numa experiência que ainda não cria pedidos.

Desktop: imagem e bloco de informação podem partilhar duas colunas, com prioridade de leitura explícita. Aqui a comparação visual do prato com informação prática justifica as colunas; não é um hero repetido em todas as páginas. Mobile: uma coluna, sem painel sticky que esconda ingredientes.

### 8.2 Informação e imagens incompletas

- Slug inexistente apresenta “Não encontrámos este prato” e link para Carta. **Não mostrar o polvo como fallback**.
- Sem imagem específica, usar uma página editorial de texto bem composta, mantendo a junta. Não reutilizar a fotografia de outro prato nem um placeholder visível como se fosse conteúdo final.
- Sem origem validada, omitir a secção. Não preencher com “produtores do Norte” ou “diretamente da lota”.
- Sem tempo validado, omitir a duração. Não inventar “10 a 15 minutos”.
- Se a informação sobre alergénios ainda não foi validada, indicar a necessidade de confirmar com a equipa. Não prometer que “a cozinha adapta quase tudo”.

### 8.3 Fotografia útil

A imagem mostra a porção vendida, com escala dada por um talher ou pelo prato real. Usar o tampo e um elemento do serviço como continuidade, sem transformar toda a fotografia num exercício de branding.

Para o arroz, a foto pode mostrar o recipiente de duas pessoas, mas a legenda deve dizê-lo e o preço continuar expresso por pessoa. Para a costeleta, não fotografar uma peça de tamanho incompatível com a descrição. É uma decisão de confiança e de experiência, além de direção de arte.

---

## 9. Ambiente: voltar ao mesmo lugar noutra hora

Ambiente deixa de ser uma sucessão de seis fotografias diferentes com carimbo de hora. Passa a demonstrar a transformação de um espaço comparável.

### 9.1 Estrutura fechada

**Abertura:** “A mesma sala, noutra hora.” Título contido, sem declarar que ninguém posou ou que a sessão aconteceu durante um serviço real.

**Comparador principal:** três fotografias da sala a partir do mesmo ponto, às 19h00, 21h00 e 23h50. Seletores com texto, troca por corte e junta gráfica sob o quadro. A mesa de referência é visível nas três. A porta para o pátio fica no mesmo lugar e mostra a diminuição da luz exterior.

**Depois do comparador:** três blocos informativos em texto — Sala, Balcão, Pátio. Cada um responde a uma diferença real de uso: tipo de lugar, exposição ao tempo, circulação, ruído ou disponibilidade sazonal. Não atribuir qualidade subjetiva como “o lugar mais romântico” a uma preferência.

**Um gesto de serviço:** uma fotografia de recolha ou colocação de um prato. Legenda descreve o que acontece, não inventa a biografia de quem está na imagem.

**Som opcional:** excerto de 18 segundos, conforme C7. Se não houver produção sonora adequada, a secção não aparece e a página continua completa.

**Informação de acolhimento:** luz, ambiente sonoro, acesso, crianças, animais e grupos, apenas conforme condições validadas. Não usar ícones decorativos; cada informação é uma frase curta com título claro.

### 9.2 O pátio precisa de função

A palavra “pátio” não se resolve com verde seco. A relação interior/exterior deve poder ser observada: porta, mudança de luz, ventilação ou passagem, consoante o espaço representado. Na casa fictícia, definir uma geografia única e preservá-la entre imagens.

Não acrescentar uma fonte, trepadeiras, um arco mediterrânico ou uma oliveira para que a imagem “pareça pátio”. Qualquer elemento arquitetónico recorrente deve estar no modelo de referência e não surgir por conveniência numa imagem isolada.

### 9.3 Mobile

Comparador 4:3; os três horários cabem em três botões de largura igual. Sem arrastar uma linha de comparação. Abaixo, os textos seguem em coluna. Não exigir paisagem, fullscreen ou auscultadores.

As imagens da sala podem ter corte 4:3 derivado de um master mais amplo, mas os três cortes têm coordenadas idênticas. Não fazer um crop “mais bonito” por hora que destrua a comparação.

---

## 10. Reservas: a hospitalidade está na precisão

A conversa humana deve surgir da escolha das palavras, da informação suficiente e da forma de lidar com erros. Não é preciso construir um chatbot ou um formulário que esconde os campos um a um.

### 10.1 Composição

Título: **“Guardamos lugar?”** Subtítulo funcional: **“Diga-nos quando vem e quantas pessoas são.”** Se o sistema apenas recebe pedidos sujeitos a confirmação, dizê-lo junto da ação principal.

Uma imagem pequena da mesa preparada aparece ao lado da introdução em desktop. Em mobile, a imagem vem depois do formulário ou é omitida; não empurra os campos para baixo.

Campos visíveis, nesta ordem:

1. Pessoas.
2. Data.
3. Hora solicitada.
4. Preferência de espaço: sem preferência, sala, balcão ou pátio — apenas opções realmente oferecidas.
5. Nome.
6. Telefone.
7. Email, se a operação o utilizar; não afirmar envio por email quando ele não existe.
8. Nota opcional: “Há alguma coisa que devamos preparar para a sua visita?”

A frase dinâmica fica **depois** dos campos principais, junto da junta gráfica: “Somos 2, na sexta, 16 de outubro, às 20h00. Preferíamos a sala.” É um resumo, não o único modo de editar os valores.

### 10.2 Estados e mensagens exatas

| Capacidade / estado real | Ação | Mensagem adequada |
|---|---|---|
| Protótipo sem envio | “Pré-visualizar pedido” | “Demonstração: este pedido não foi enviado e não reservou uma mesa.” |
| Sistema recebe um pedido sujeito a confirmação | “Pedir reserva” | “Recebemos o seu pedido, Ana. A mesa fica confirmada quando a equipa responder.” |
| Backend confirmou efetivamente uma reserva | “Confirmar reserva” | “Reserva confirmada, Ana.” + data, hora, pessoas e referência recebida |
| Envio falhou | “Tentar novamente” | “Não conseguimos enviar o pedido. Os dados continuam preenchidos.” |
| Estado do envio incerto | “Verificar pedido” ou recuperação existente | “Ainda não conseguimos confirmar se o pedido foi recebido.” Não mandar repetir cegamente |

“Até sexta, Ana” pode ser uma linha secundária depois de confirmação real, nunca a única indicação de estado. Não prometer email, telefonema ou atribuição de pátio se o fluxo não os garante.

A V3 do pacote local usa a primeira linha da tabela até existir ligação real ao fluxo de reservas. Não acrescentar um backend nesta revisão apenas para sustentar uma frase.

### 10.3 Disponibilidade e espera

Remover a indisponibilidade pseudoaleatória existente. Se não há inventário de mesas ou slots reais, mostrar horas solicitáveis dentro do horário configurado e declarar que o pedido depende de confirmação. Não apresentar “última mesa”, “só mais um horário” ou lugares a desaparecer como recurso persuasivo.

Não confundir fechar o restaurante às 00h00 com aceitar chegada às 00h00. Se o produto não tem uma política de última entrada validada, não a inventar: no protótipo, horários continuam demonstrativos e identificados como tal; na integração real, a política é fornecida pelo restaurante antes de ativar pedidos.

Depois de enviar, o feedback aparece imediatamente no mesmo ponto da página. Aguardar a resposta do servidor não é uma metáfora da cozinha. Campos inválidos têm mensagem próxima e resumo de erros com foco acessível; os valores corretos não desaparecem.

### 10.4 O que não fazer

Não animar cadeiras conforme o número de pessoas. Não perguntar oito coisas como se fosse um chat. Não atribuir uma mesa fictícia. Não usar uma ilustração de calendário. Não trocar a imagem para sugerir que aquele espaço foi garantido. Não guardar telefone ou email em parâmetros da URL.

---

## 11. Sobre, Contactos e rodapé

Estas páginas têm de pertencer ao mesmo sistema. Deixá-las em Organic faria a V3 parecer uma campanha acrescentada ao template antigo.

**Sobre:** abrir com uma declaração concreta de prática da casa, seguida de duas ou três informações verificáveis. Usar G01, o gesto de serviço, e M01, o detalhe de construção, se acrescentarem sentido. A história de uma antiga oficina, datas de abertura, nomes de fornecedores, retratos e citações só são publicados como factos depois de validados. Na demonstração podem existir personagens fictícias, mas o contexto de demonstração precisa ser explícito; não são testemunhos.

**Contactos:** morada, horários e contacto em hierarquia de serviço. Mapa ou link para mapa apenas com endereço real validado. O endereço e o telefone do protótipo são placeholders: não encaminhar inadvertidamente o visitante para um estabelecimento ou número real de terceiros. Não inventar minutos a pé ou acessibilidade.

**Horário:** consumir uma fonte única. O header atual diz “Terça a domingo, a partir das 19h”, enquanto o cadastro só abre domingo ao almoço. Corrigir a divergência; a narrativa até à meia-noite não substitui esse cadastro.

**Rodapé:** pequeno, claro, sem mural tipográfico. Nome, assinatura apenas se não repetida imediatamente acima, links essenciais e contactos. Durante a demonstração pública, indicar “Restaurante fictício · demonstração”. A indicação pode ser discreta, mas tem de ser legível e encontrável.

---

## 12. Mobile: uma mão, informação inteira

### 12.1 Breakpoints e prioridades

| Largura | Layout | Condição |
|---|---|---|
| 320–767 px | Uma coluna; margens de 16/20 px; sequência 4:3 em fluxo | Nenhum conteúdo essencial exige gesto lateral |
| 768–1023 px | Uma coluna larga ou duas colunas apenas em informação auxiliar | Carta continua a privilegiar uma linha legível por produto |
| ≥ 1024 px | Composição desktop; índice lateral na Carta; colunas úteis em Produto | Sem impor altura de viewport ao formulário ou ao conteúdo |

Testar pelo menos 320 × 568, 390 × 844, 768 × 1024 e 1440 × 900, além de zoom a 200%. Não desenhar apenas para um telefone grande.

### 12.2 Controlos e navegação

- Alvo mínimo projetado de 48 × 48 px para ações principais e seletores, com separação suficiente entre ações adjacentes.
- Na sequência Home, cinco botões em grelha de cinco colunas: Antes, Pão, Centro, Ficar, Depois. Hora numa segunda linha. Em 320 px, reduzir o intervalo entre botões, não a área de toque abaixo de 48 px.
- “Anterior” e “Seguinte” aparecem em linha própria, fora da fotografia. Não exigir que a pessoa descubra um gesto.
- Em Carta e Produto, barra inferior de 56 px mais área segura do sistema, com “Carta” e “Reservas”. A ação da página atual é indicada como atual, sem navegação redundante. O conteúdo tem padding inferior suficiente para nunca ficar tapado.
- Em Reservas, não há barra inferior fixa concorrente com teclado e botão de envio. A ação principal está no fluxo do formulário.
- Menu aberto deve ter foco controlado, fechar por Escape e devolver foco ao botão que o abriu; o conteúdo atrás não recebe interação. Não usar animação de onda ou forma orgânica.

### 12.3 Imagem, leitura e condições reais

As fotografias da sequência não mudam para 9:16 no telefone. O reconhecimento depende de ver o mesmo quadro. Uma fotografia menor mas íntegra serve melhor a ideia do que uma imagem vertical que corta o suporte.

Preço e unidade ficam visíveis sem abrir Produto. Textos longos quebram; não há ellipsis em nome, preço ou condições da reserva. O teclado não tapa mensagens de erro ou o botão final. Não existem informações acessíveis só por hover.

Em rede lenta, o texto e as ações continuam utilizáveis enquanto a foto chega. Uma falha de imagem não apresenta um retângulo enorme vazio antes da Carta; usar a região reservada com uma mensagem curta e manter a navegação. Sem áudio e sem animação, o site continua a ser o mesmo produto.

---

## 13. Direção fotográfica: continuidade antes de quantidade

A produção deve parecer uma sessão dirigida no mesmo espaço, não uma coleção de bons resultados independentes. A exigência principal é **continuidade verificável**, além de apetite e realismo.

Esta direção utiliza a metodologia da Biblioteca Visual: **BASE + CENA/LUZ + CÂMARA + ACABAMENTO + SAÍDA/RESTRIÇÕES**. Os slash commands são vocabulário de direção; não são funções do site. As instruções em linguagem natural resolvem ambiguidades e especificam o que os comandos não dizem.

### 13.1 Referência comum antes de qualquer série

Aprovar primeiro T01 como referência-mãe e um registo material da mesa. Fixar:

- Tampo aproximado de 140 × 80 cm; relação 5:3 entre as duas partes visíveis; junta estreita de ferro mate. A geometria final aprovada deve ser reutilizada, não reinterpretada a cada geração.
- Madeira castanha de contraste moderado; cerâmica clara, sem aspeto luxuoso irreal; guardanapo cru sem logótipo; vidro comum de boa qualidade, sem peças diferentes a cada cena.
- Dois lugares nesta sequência. Não aumentar o número de talheres ou copos sem causa no serviço.
- Direção da luz exterior: lado superior esquerdo do quadro. Fonte quente de sala fixa, lateral direita, com reflexos consistentes. A contribuição exterior diminui durante a noite; a luminária não teletransporta.
- Câmara superior a 90°, lente equivalente a 50 mm, quadro horizontal 4:3. Manter posição, distância, correção de perspetiva e crop. A profundidade deve permitir ler toda a mesa; referência f/8, sem bokeh artificial nesta série.
- Movimento do serviço predominantemente pela borda direita do quadro. No máximo uma ação humana em cada foto da sequência; mão e braço entram de modo plausível e não tapam o prato principal.

**Nota sobre `/samesetup`:** a biblioteca inclui também luz no setup. Aqui ele serve para manter geometria, câmara, materiais e fontes físicas. Especificar expressamente que a contribuição da luz exterior pode mudar entre horas. Não dar simultaneamente ordens de “luz idêntica” e “noite mais escura”.

Se a ferramenta de geração não conservar estrutura, corrigir usando a referência aprovada ou refazer a imagem. Não resolver inconsistência física com recorte, filtro ou blur. Sem referência visual estável, esta direção perde o seu principal código.

### 13.2 Série central T — cinco imagens obrigatórias

**Base comum:** `/flatlaytable + /topdownflatlay + /photoreal + /matteneutral + /notext + /nobrandmarks + /realisticproportions`. Proporção **4:3 explicitada por escrito**; não inventar um slash command para ela. Usar `/windowlight` em T01/T02 e `/practicalwarm` em T03–T05, com a continuidade de fontes descrita. Não adicionar `/pastelsoft`.

| ID | Objetivo e local | Composição / luz / acabamento | Prompt-base específico |
|---|---|---|---|
| **T01 — Antes** | Home inicial; pequeno recorte em Reservas | Mesa inteira com margens suficientes para ver o tampo; dois lugares; pão inteiro; luz exterior suave predominante, fonte quente já coerente; madeira e comida com cor verdadeira | “Fotografia profissional superior a 90° de uma única mesa retangular de madeira castanha mate, com junta de ferro escuro a cinco oitavos do comprimento. Dois lugares preparados de modo humano, não perfeitamente espelhados; copos de água, guardanapo cru e pão inteiro num prato pequeno. Luz exterior suave pelo lado superior esquerdo e contribuição discreta de uma luminária à direita. Lente equivalente a 50 mm, f/8, 4:3, cor natural. Nenhuma letra, marca ou objeto inventado.” |
| **T02 — Pão** | Home, segundo estado | Exatamente a mesma geometria; pão agora partido; pequenas migalhas; uma mão termina de pousar o prato; exterior um pouco menos intenso | “Usar T01 como referência de mesa, câmara, louça e posição das fontes. Avançar quarenta minutos: pão partido, manteiga começada, um copo ligeiramente deslocado e um único braço a terminar o gesto de servir pela direita. Preservar a junta, os veios e a dobra reconhecível do guardanapo. Migalhas poucas e plausíveis. Mesma lente, altura, 4:3 e tratamento fotográfico.” |
| **T03 — Centro** | Home; imagem de contexto no fim da Carta | Travessa de costeleta para dois; primeira porção retirada; prato de pão continua reconhecível; luz exterior baixa, luz prática predominante, comida sem dominante laranja | “Partir de T02 e conservar o mesmo tampo, câmara e dois lugares. Uma costeleta fatiada para duas pessoas, de escala plausível, chega numa travessa ao centro; uma porção já foi distribuída. O pão quase terminou. Copos e guardanapo têm continuidade de uso. A contribuição exterior diminuiu, a luminária da direita mantém direção e posição. Superfícies tostadas naturais, sem brilho plástico, 4:3, foco suficiente na mesa toda.” |
| **T04 — Ficar** | Home, quarto estado | Travessa retirada; prato de pudim com última colherada; dois copos; guardanapo em posição derivada da anterior; exterior escuro | “Continuar a mesma noite e a mesma fotografia-base depois de recolher a travessa. Manter copos e marcas coerentes. Um prato pequeno com a última colherada de pudim e duas colheres usadas, sem montar um anúncio de sobremesa. A mesa fica mais vazia ao centro. Luz quente de fonte real, sombras com detalhe, vidro sem duplicações. Não alterar tampo, junta, louça ou perspectiva.” |
| **T05 — Depois** | Home final; apoio a Sobre se pertinente | Quase vazia; copos retirados; marca de água exatamente onde houve copo; poucas migalhas; pano numa borda; luminária ainda ligada | “A mesma mesa depois da recolha, perto da meia-noite. Retirar os objetos de T04 de forma lógica, deixando apenas uma marca de água, poucas migalhas e a borda de um pano de serviço à direita. A madeira revela-se de novo; a junta e o enquadramento coincidem com T01. Nada de sujidade teatral, melancolia de abandono ou luz cinematográfica impossível. Fotografia realista da continuidade de um serviço.” |

Acrescentar `/samesetup` a T02–T05 com a ressalva de luz acima. Não acrescentar `/nopeople` a T02, pois contradiz a mão prevista. Em T01/T03/T04/T05, evitar pessoas visíveis salvo aprovação explícita de uma ação necessária.

### 13.3 Série S — a geografia e a luz da sala

Três imagens obrigatórias: **S01 às 19h00, S02 às 21h00, S03 às 23h50**. Uso: comparador de Ambiente. A mesma sala, câmara e corte em todas.

- **Assunto e composição:** vista à altura dos olhos, mesa de referência no primeiro plano lateral, porta para o pátio ao fundo; espaço suficiente para compreender circulação. Não compor uma sala simétrica de hotel.
- **Câmara:** equivalente a 35 mm, altura aproximada de 1,45 m; sem ultra grande angular; master com margem, exportação 4:3 idêntica nos três estados. Especificar a lente em linguagem natural; não chamar a esta foto `/wide24mm`.
- **Luz:** S01 mistura exterior e luminárias; S02 exterior escuro e sala em serviço; S03 mesmas luminárias e menor ocupação. Sem HDR, sem uniformizar todos os cantos iluminados.
- **Acabamento:** fotográfico, contraste moderado com pretos presentes, cor de madeira e pele plausível. Nada de fotografia lavada por CSS.
- **Comandos:** `/boutiqueinterior + /eyelevel + /photoreal + /matteneutral + /notext + /nobrandmarks + /realisticproportions`; `/windowlight` ou `/practicalwarm` conforme estado; `/samesetup` nas derivações. A palavra “boutique” não autoriza acrescentar decoração.
- **Prompt-base:** “Fotografia observacional da mesma sala do Pátio do Ferro, com a mesa de referência e a porta para o pátio em posições fixas. [Descrever hora e ocupação]. Lente 35 mm à altura dos olhos, sem exagerar a escala. A arquitetura, mobiliário e fontes de luz são os da referência; só mudam ocupação e contribuição exterior. Pessoas em grupos pequenos, variadas e discretas, sem clones nem gestos de publicidade. Não acrescentar plantas, arcos, candeeiros ou mesas para preencher espaços.”

S02 admite pessoas em plano médio/fundo, sem retratos dominantes. S03 pode mostrar uma única pessoa a recolher, evitando que ela seja duplicada noutras posições. Não afirmar que as imagens documentam um serviço real se forem geradas.

### 13.4 Série P — cinco pratos para reconhecer o que se escolhe

Cinco imagens obrigatórias: **P01 Polvo**, **P02 Costeleta**, **P03 Couve**, **P04 Arroz de carabineiro**, **P05 Pudim**. Uso: Produto e materiais pontuais da Carta. Não criar fotografias só para preencher todos os 23 produtos nesta revisão.

- **Objetivo:** mostrar a porção, a confeção e a apresentação da casa, com continuidade de mesa.
- **Composição:** prato ocupa aproximadamente 60–70% da imagem; junta do tampo aparece junto a uma lateral; um talher dá escala. Nenhum vaso, tecido ou ingrediente cru entra apenas como adereço.
- **Luz:** lateral suave, com fonte prática coerente com a sala e correção de cor suficiente para identificar alimento. Uma fotografia pode ser produzida com luz de apoio; o resultado não deve sugerir uma janela inexistente.
- **Câmara:** equivalente a 50 mm, ângulo aproximado de 45°, f/5,6 como referência. Detalhe suficiente no alimento; não desfocar metade da porção. Proporção 4:3.
- **Acabamento:** microtextura natural, humidade plausível, tostado irregular; sem HDR, saturação de catálogo ou verniz excessivo.
- **Comandos:** `/signaturedish + /practicalwarm + /photoreal + /matteneutral + /notext + /nobrandmarks + /realisticproportions`. Acrescentar a lente, o ângulo e a proporção por escrito. Usar `/foodhero` em alternativa a `/signaturedish` quando a intenção for mostrar a porção com maior frontalidade, nunca acumular bases contraditórias.
- **Prompt-base:** “Fotografia profissional de [prato], na porção [porção validada], servido na louça aprovada sobre a mesa de referência do Pátio do Ferro. A junta aparece discretamente numa lateral. [Descrever apenas ingredientes validados]. Lente 50 mm a 45 graus, f/5,6, quadro 4:3. Luz lateral de aparência física coerente, alimento de textura verdadeira, pequenas irregularidades de confeção. Um talher dá escala. Sem lettering, marca, ingredientes extra, louça duplicada ou empratamento impossível.”

| ID | Exigência específica |
|---|---|
| P01 | Polvo e acompanhamentos correspondem ao cadastro validado; não aumentar artificialmente tentáculos ou criar cortes anatomicamente impossíveis |
| P02 | Peça e travessa plausíveis para cerca de 1 kg e duas pessoas; sem usar uma imagem de porção individual para vender a peça inteira |
| P03 | Couve tostada, avelã, queijo e manteiga conforme receita; não apresentar aspeto carbonizado uniforme nem sugerir prato vegan |
| P04 | Recipiente para duas pessoas; legenda “Apresentação para duas pessoas”; preço público continua por pessoa |
| P05 | Porção pequena de pudim, brilho de caramelo controlado, corte ligeiramente irregular; não criar sobremesa de restaurante diferente |

### 13.5 Quatro imagens complementares, com função definida

| ID | Objetivo / local | Direção completa | Comandos e prompt-base |
|---|---|---|---|
| **B01 — Vermute** | Produto do vermute; Copos quando útil | Um copo sobre a mesa ou balcão real do mesmo espaço, laranja e gelo plausíveis; luz posterior suave de fonte identificável; 50 mm a 45°, f/4; 4:3; condensação moderada, sem néon | `/cocktailbarshot + /backlit + /practicalwarm + /photoreal + /matteneutral + /notext + /nobrandmarks`. “Um vermute da casa, com laranja e gelo grande, no espaço de referência; reflexo de luminária coerente, bebida translúcida, vidro único, sem decorar o balcão com garrafas inventadas.” |
| **G01 — Serviço** | Ambiente e Sobre | Um gesto legível de pousar ou recolher a travessa, pela direita; rosto dispensável; lente 50 mm à altura da mesa, profundidade suficiente para mãos e prato; 4:3; luz prática real | `/handsatworkcloseup + /practicalwarm + /photoreal + /matteneutral + /notext + /nobrandmarks + /realisticproportions`. “Um único funcionário termina de pousar uma travessa com as duas mãos em posição anatomicamente plausível; a mesa e louça são as da referência, gesto de trabalho, sem posar para a câmara.” |
| **M01 — Junta** | Sobre; referência material, não fundo decorativo | Encontro de madeira e ferro nivelado; marcas discretas de uso; lente 85 mm, f/5,6; recorte horizontal 4:3; luz lateral real; sem ferrugem estilizada | `/detailinsert + /tele85mm + /windowlight + /photoreal + /matteneutral + /notext + /nobrandmarks`. “Detalhe da junta real da mesa aprovada, madeira castanha mate e ferro escurecido, construção simples, sem logótipos, rebites decorativos ou textura de cenário industrial.” |
| **E01 — Limiar** | Contactos; entrada da casa | Porta vista da rua ao anoitecer com um pouco de interior; mesma arquitetura da série S; 35 mm à altura dos olhos, 4:3; luz interior quente e exterior natural, sem rua molhada artificial | `/boutiqueinterior + /eyelevel + /practicalwarm + /photoreal + /matteneutral + /notext + /nobrandmarks`. “A entrada da casa fictícia coerente com a sala aprovada, vista da rua, com profundidade suficiente para reconhecer a passagem para o interior; nenhuma placa, número ou logótipo gerado. Não imitar um endereço real apresentado como verificado.” |

Total planeado: **17 imagens** — cinco T, três S, cinco P e quatro complementares — e **um áudio opcional**. Os recortes derivados para mobile não contam como novas cenas.

Não produzir café, latte art ou montra de pastelaria apenas porque a biblioteca tem esses comandos. `/coffeecounterscene`, `/latteartmacro` e `/bakerydisplaycase` não representam a oferta atual desta casa. Tampouco produzir cocktails que não existem na carta.

### 13.6 Tratamento, exportação e honestidade

- Sem `.washed`, filtro CSS de saturação/contraste, presets pastel, laranja global ou grão adicionado em cima de todas as páginas. Se houver grão, pertence ao tratamento fotográfico individual e deve sobreviver sem parecer ruído digital.
- Nada de texto, marca, preço ou título dentro da imagem. Tipografia fica no HTML. O logótipo nunca é inventado pelo gerador.
- Fotografias da mesa: masters pelo menos 2400 × 1800, se a ferramenta permitir; derivados responsivos de 480, 800, 1200 e 1600 px de largura. Não ampliar artificialmente ficheiros pequenos para satisfazer um número.
- Preferir AVIF/WebP com fallback apropriado; atributos de dimensão e `srcset`. Meta de produção para a primeira imagem mobile: até cerca de 160 kB, sujeita a inspeção visual; não sacrificar a textura do alimento para cumprir cegamente um peso.
- Carregar a primeira imagem prioritariamente; restantes conforme necessidade. Não baixar as 17 imagens em resolução máxima no primeiro acesso.
- Alt text descreve conteúdo e diferença relevante, sem repetir todas as legendas. Exemplo: “A mesma mesa depois da recolha, com uma marca de água no lugar do copo.”
- O tenant demo identifica-se como fictício. Na adaptação a um restaurante real, imagens geradas de espaços, equipa ou pratos devem ser revistas quanto à correspondência ao que o cliente encontrará. A direção não autoriza apresentar ambiente ou produto inexistente como fotografia documental.

## 14. Um template premium sem distribuir a mesma identidade a todos

O que se pode repetir é a infraestrutura de experiência: componentes acessíveis, contratos de dados, comparação de cenas, carta, estados de formulário e gestão de imagens. **A mesa 5:3, a junta aberta e esta sequência específica pertencem ao tema Pátio do Ferro.** Se forem impostas a todos, a identidade volta a ser um template reconhecível antes de ser uma casa.

### 14.1 Separação proposta

| Camada | Compartilhado | Configurável por restaurante | Não fazer |
|---|---|---|---|
| Núcleo | Rotas, navegação, campos, validação, lista de produtos, acessibilidade, carregamento | Dados operacionais e conteúdo | Reescrever o núcleo para mudar uma fotografia |
| Composição | Componente de cena estável, seletor de 3–5 estados, legenda e comparador | Ativar ou não a sequência; objeto/lugar de referência; conteúdo dos estados | Um editor livre de arrastar qualquer bloco |
| Tema | API de tokens e slots semânticos | Fontes, cores, densidade, regra de separação, proporção principal | Dizer que cinco paletas criam cinco marcas |
| Identidade da casa | Estrutura de assets e referências | Material recorrente, gestos, direção de luz, linguagem das legendas | Reutilizar a mesa do Pátio numa pizzaria com logótipo diferente |
| Produção | Pipeline de exportação e QA | Fotografias e som próprios, ou ausência de som | Usar banco genérico para substituir coerência espacial |

A configuração não oferece vinte sliders de raio, sombra e assimetria. Oferece um conjunto pequeno de parâmetros aprovados e assets coerentes com esses parâmetros.

### 14.2 Três provas de portabilidade do método

Estas são aplicações do método, não direções alternativas para o Pátio:

- **Café de bairro:** o lugar de referência pode ser o mesmo trecho do balcão, da abertura ao último café. A fila, as chávenas e o trabalho mudam; não copiar a junta de ferro nem a narrativa até à meia-noite.
- **Pizzaria:** uma posição constante junto da bancada de saída pode mostrar massa, forno, corte e partilha. Preservar informação rápida de tamanhos e preços; não impor uma experiência lenta porque existe uma sequência.
- **Bar:** o mesmo conjunto de lugares ao balcão permite observar montagem, ocupação e recolha. A luz e o vidro são códigos próprios; não basta substituir a costeleta por um cocktail no tema do Pátio.

O valor premium está na autoria de cada sistema e na execução consistente. O núcleo reduz custo de construção; não deve eliminar o trabalho de direção de arte.

---

## 15. Anti-padrões específicos da V3

1. **Minimalismo industrial genérico.** Tirar círculos e pôr cinzento, stencil, grelha técnica e ferrugem é apenas mudar de cliché. A precisão da composição não deve parecer uma oficina temática.
2. **Uma mesa diferente em cada imagem.** É o erro mais grave desta direção. Sem continuidade, a Home vira uma galeria banal com legendas de hora.
3. **Cenografia perfeita.** Copos alinhados a régua, comida intacta em todos os estados e guardanapos sempre dobrados contradizem uma noite em curso.
4. **A marca como textura.** Ferro, madeira, papel e manchas não são fundos decorativos para preencher margens.
5. **Assinatura gráfica em excesso.** Repetir a junta em cada linha dilui o código e prejudica a carta. Uma ocorrência por unidade principal é suficiente.
6. **Preço escondido em favor de atmosfera.** Carta e Reservas continuam acessíveis desde o primeiro ecrã; não há desbloqueio narrativo.
7. **Tempo imposto.** Nenhuma animação, transição de página ou espera simulada força a pessoa a “abrandar”.
8. **Fotografia demasiado escura.** “Noite” não autoriza perder textura da comida, circulação da sala ou legibilidade. O alimento precisa ser desejável e reconhecível.
9. **Uma interface que muda de personalidade conforme a hora.** A UI não passa de revista clara a bar escuro ao selecionar Ficar.
10. **Som como espetáculo.** Não usar autoplay, ruído de fogo contínuo, sons de interface ou música para compensar fotografia fraca.
11. **Histórias, origens e confirmações inventadas.** Copy calorosa não valida uma afirmação. Informação fictícia é identificada; lacunas reais não são preenchidas por imaginação.
12. **Metáforas ambíguas de compra.** “Pôr na mesa”, “o seu lugar” e objetos acumulados podem sugerir pedido ou reserva. Só usar quando a funcionalidade e o estado correspondem.
13. **Apenas mudar fontes e cores.** Deixar as mesmas máscaras, alternâncias, colagens e revelações produz V2 com outra roupa.
14. **Deixar páginas secundárias para depois.** Contactos em Organic e Reservas em V3 revelam a costura do template.
15. **Confundir silêncio visual com ausência de direção.** Se uma página perdeu fotografia, junta, alinhamento e linguagem de serviço, não está “mais minimal”; perdeu os códigos da casa.

---

## 16. O que manter, alterar e eliminar do pacote atual

| Arquivo / área | Manter | Alterar | Eliminar |
|---|---|---|---|
| `DIRECAO-CRIATIVA.md` | Noite, serviço, capítulos, hospitalidade | Substituir pelas decisões V3 e apontar para este documento | Defesa de Organic como identidade inevitável da casa |
| `_ds/organic-…/styles.css` e bundle | Nada da direção gráfica como obrigação; aproveitar apenas comportamentos genéricos se forem necessários e desacopláveis | Remover referências ao tema Organic das páginas; aplicar tema local V3 | Dependência visual de Caprasimo, terracota/sage, radii e `.washed` |
| Manifesto e regras de aderência Organic | Integridade do ambiente de edição, se necessário | Selecionar/declarar o novo tema no mecanismo suportado pelo projeto | Regras herdadas que obrigam círculos, arredondamento ou aquela fonte |
| `Home.dc.html` | Assinatura, ideia de noite, links para oferta | Construir uma única sequência de cinco estados; quatro linhas de carta explícitas | Hero em arco, título sobreposto, círculos de materiais, colagens e blocos de cor concorrentes |
| `Carta.dc.html` | Seis capítulos, preços, tags válidas, ligações | Hierarquia, índice mobile, unidades de preço, texto de preparação | Título monumental, máscaras por capítulo, hover com deslocamento, discurso defensivo sobre espera |
| `Produto.dc.html` | Relação por slug, capítulo e acompanhamento existente | Preço/porção antes da prosa; foto real do item; estados de dados ausentes | Fallback para polvo, origem/tempo inventados, ingredientes em pills e fotos redondas |
| `Ambiente.dc.html` | Ensaiar uma noite; informação de acolhimento | Mesmo ponto de vista em três horas; contexto espacial; som opcional | Seis enquadramentos arbitrários tratados como transformação; alegação documental não sustentada |
| `Reservas.dc.html` | Tom humano, campos úteis e preferências | Labels, resumo, estados verdadeiros, conservação de dados em erro | Disponibilidade pseudoaleatória e confirmação local apresentada como reserva real |
| `Sobre.dc.html` | Trabalho e pessoas como assunto | Práticas verificáveis e gestos de serviço; ficção identificada | História de oficina, testemunhos e origens apresentados como factos sem validação |
| `Contactos.dc.html` | Hierarquia de chegada e contacto | Fonte única de horários; dados demo tratados corretamente | Mapa/endereço/telefone demonstrativos apresentados como operação real; tempos a pé inventados |
| `SiteHeader.dc.html` | Navegação semântica e acesso a Reservas | Tamanho, links, estados ativos, menu acessível, horário consistente | Blur, pills, afirmação errada sobre domingo à noite |
| `SiteFooter.dc.html` | Contactos e navegação | Escala normal, informação curta e contexto demo | Slogan monumental e assinatura visual Organic residual |
| `carta-data.js` | 23 produtos, seis capítulos, slugs e separação de dados | Revisar conteúdo factual; expor explicitamente unidade/porção onde necessário, sem quebrar rotas | Uso de ordem acidental para escolher destaques; fallbacks editoriais fabricados |
| `patio-motion.js` | Respeito por movimento reduzido | Pequenas operações explícitas e locais | Reveals globais, escalas de 1,06 e esperas de 1,1–2,4 s |
| `image-slot.js` | Utilidade de edição enquanto não há assets aprovados | Slots identificados pelos IDs da nova produção | Placeholders na entrega visual final, prompts visíveis no site publicado |
| `support.js` | Runtime/harness existente | Apenas se houver necessidade técnica comprovada de compatibilidade | Reescrita ou migração de framework como parte desta revisão visual |

Se o sistema de edição exigir uma associação de design system, usar o mecanismo próprio para trocar essa associação. Não falsificar regras de aderência nem editar um pacote externo compartilhado por outros projetos. O resultado tem de ser um tema V3 do projeto, sem a obrigação contraditória de “obedecer ao Organic”.

---

## 17. Contrato de implementação para Claude

### 17.1 Instrução de entrada

> Implemente a direção V3 do Pátio do Ferro conforme este documento. Preserve rotas, os 23 produtos, os seis capítulos e contratos existentes. Substitua integralmente a linguagem Organic da experiência pública. Não crie nova stack, backend, 3D, carrinho ou efeitos fora do sistema especificado. Trate a reserva de acordo com a capacidade real do projeto. Use placeholders apenas durante trabalho; não declare a direção visual concluída sem a série fotográfica coerente. Entregue capturas das páginas e evidências dos critérios de aceite.

Esta instrução destina-se à próxima etapa. O presente documento não constitui implementação do site.

### 17.2 Organização mínima recomendada

Não há necessidade de reorganizar todo o repositório para aplicar a direção. Para o pacote exportado, manter as páginas atuais e acrescentar os seguintes módulos locais, com responsabilidades únicas:

| Módulo proposto | Responsabilidade |
|---|---|
| `patio-v3.css` | Tokens, tipografia, layouts, régua de serviço, controlos, breakpoints e movimento reduzido |
| `patio-scenes.js` | Definição dos cinco momentos Home, três momentos Ambiente, legendas e referências de media |
| `patio-scene-viewer.js` | Seleção, estado de carregamento, corte, pré-carregamento e anúncio acessível; adaptado ao runtime existente |
| `patio-media.js` | Manifesto de assets e textos alternativos; nenhuma URL solta repetida nas páginas |
| `patio-motion.js` | Apenas as operações permitidas; pode ser removido se CSS e componentes já cobrirem tudo |
| `carta-data.js` | Carta e dados da casa; continua separado da apresentação |
| `assets/patio/images/` | Derivados aprovados T, S, P, B, G, M e E |
| `assets/patio/audio/` | Excerto opcional e descrição associada |
| `assets/patio/fonts/` | Fonte Archivo local e licença |

Numa aplicação já organizada por componentes, usar os diretórios equivalentes que ela possui, sem criar uma segunda arquitetura. A divisão de responsabilidades continua a mesma.

### 17.3 Contratos de dados suficientes

**Cena:** `id`, `label`, `editorialTime`, `caption`, `mediaId`, `alt`, `optionalLink { label, href }`. Ordem explícita. Não deduzir sequência por nome de ficheiro ou timestamp real.

**Media:** `id`, `sourceMaster`, `derivatives[] { src, width, height, format }`, `aspectRatio`, `alt`, `approved`, `referenceGroup`. Os grupos T e S partilham geometria dentro do respetivo grupo. `approved` é uma marca de revisão editorial, não uma avaliação automática de qualidade.

**Estado do visualizador:** momento atualmente exibido, momento solicitado, carregamento/erro. A imagem exibida só muda quando o pedido mais recente foi descodificado. Hora e legenda pertencem sempre à imagem exibida; a região de estado pode informar o pedido em curso.

**Acessibilidade do visualizador:** região com nome “Uma noite no Pátio”; botões normais com `aria-pressed` para a seleção; `aria-controls` aponta para a figura. Ordem de Tab natural. Uma região de estado `aria-live="polite"` anuncia, após ação, “Centro, 21h00” ou falha; não lê a página toda nem desloca foco para a imagem. Não usar padrão de tabs se não forem implementadas as respetivas interações de teclado.

**Reserva:** distinguir apresentação de demonstração, pedido enviado e confirmação real. A UI não inventa o estado a partir de um temporizador. Usar o contrato funcional já existente; a revisão visual não cria disponibilidade real.

### 17.4 Ordem de execução e saídas

| Passo | Trabalho | Saída verificável |
|---|---|---|
| 1 — Desacoplar | Registar rotas e dados; retirar dependência visual Organic; aplicar tema V3 em todas as páginas | Nenhuma página essencial depende da gramática antiga; navegação e 23 produtos preservados |
| 2 — Provar o código | Produzir/aprovar referência T01 e M01; compor Home em 390 e 1440 px com tokens e junta | A mesa e a gramática gráfica podem ser avaliadas antes de produzir toda a série |
| 3 — Completar a continuidade | Produzir T02–T05 e S01–S03; verificar alinhamento e história material | Cinco estados de uma mesa e três de uma sala, sem mudança arbitrária de cenário |
| 4 — Implementar a navegação da noite | Visualizador manual, URL, carregamento, falha, teclado e movimento reduzido | Sequência utilizável sem autoplay, scroll especial ou imagem nova associada à legenda errada |
| 5 — Resolver as páginas de decisão | Carta, Produto e Reservas; porções, unidades e estados verdadeiros | Escolher e pedir reserva é mais claro do que na V2; nenhuma capacidade fictícia |
| 6 — Fechar a casa | Ambiente, Sobre, Contactos, header e footer; restantes assets | Todas as páginas falam a mesma linguagem; nenhuma ilha de Organic |
| 7 — Verificar | Critérios da secção seguinte, capturas, comparação sem nome e falhas | Entrega acompanhada de evidência, limitações factuais e assets pendentes, se existirem |

O passo 2 é uma verificação concreta do próprio implementador, não uma obrigação de interromper o trabalho para pedir aprovação de cada detalhe. Se a direção falhar num teste, corrigir a causa e continuar. Só declarar bloqueio quando faltar algo que não pode ser inferido honestamente — por exemplo, dados operacionais reais para ativar reservas reais.

---

## 18. Critérios de aceite visual e de experiência

A implementação não é aceite porque “parece premium”. Deve cumprir observações verificáveis. Estes testes são especificados para a próxima versão; **não foram executados sobre um site V3 nesta etapa**.

### 18.1 Reconhecimento sem nome

A pergunta central pressupõe algum contacto anterior com a marca. Ninguém identifica espontaneamente o nome de uma casa que nunca viu. O teste correto é saber se, depois de conhecer um exemplar, reconhece os outros sem depender do logótipo.

**Teste proposto:** mostrar a Home V3 durante dez segundos a cinco pessoas que não participaram no projeto. Depois apresentar, sem nome, domínio, slogan ou fotografias idênticas à Home, capturas de Carta, Produto, Ambiente e Reservas misturadas com quatro páginas de outros estilos. Pedir que agrupem as que parecem pertencer à mesma casa e expliquem por quê.

**Meta de aceite desta revisão:** pelo menos quatro das cinco pessoas agrupam corretamente três das quatro páginas Pátio e mencionam pelo menos dois códigos concretos — mesa/material, junta, estabilidade do enquadramento, montagem ou hierarquia de serviço. “É bege e tem uma fonte bonita” não conta como evidência de identidade. É um teste formativo pequeno, não uma comprovação estatística de exclusividade.

Se falhar, corrigir primeiro continuidade, recorrência e hierarquia. Não responder acrescentando mais uma textura, animação ou símbolo.

### 18.2 Checklist visual

- [ ] Nenhum arco, círculo de recorte, blob, pill decorativa ou título monumental herdado de Organic permanece.
- [ ] A mesa dos cinco estados tem os mesmos cantos, junta, veios e proporções. Sobreposição das imagens em 50% de opacidade permite verificar a geometria; os objetos de serviço podem mudar.
- [ ] Os três quadros da sala mantêm porta, mesa e posição de câmara. Não foi usado um crop diferente para disfarçar inconsistência.
- [ ] Há pelo menos três referências materiais herdadas entre estados adjacentes da mesa, conforme C4, considerando a recolha explicável no estado final.
- [ ] Sem horas e legendas, quatro de cinco avaliadores conseguem ordenar pelo menos quatro dos cinco quadros pelo avanço do serviço. Não se exige distinguir minutos exatos.
- [ ] A régua de serviço tem espessura e interrupção consistentes, sem se multiplicar em cada linha da carta.
- [ ] Títulos respeitam a escala; nenhum cobre a fotografia ou empurra sozinho os primeiros produtos para outro ecrã.
- [ ] A cor da comida é plausível e a luz tem direção; não há tratamento lavado, HDR, dominantes laranja indiscriminadas, mãos deformadas ou objetos duplicados.
- [ ] Produto mostra porção e escala compatíveis com preço e descrição. P04 identifica apresentação para duas pessoas.
- [ ] O site continua reconhecível com animações e som desligados. A identidade não depende de uma demonstração conduzida pelo designer.
- [ ] A Home inicial não promete que a casa está aberta naquele instante. Horas editoriais e horário de funcionamento são distinguíveis.
- [ ] Em texto e fotografia, não se apresenta material gerado ou fictício como registo documental comprovado.

### 18.3 Checklist de utilização

- [ ] Carta e Reservas estão a um clique/toque a partir da navegação, sem atravessar a sequência da Home.
- [ ] Qualquer momento pode ser escolhido diretamente; clicar rapidamente não faz uma imagem antiga substituir a escolha mais recente.
- [ ] A navegação da noite não cria uma pilha de cinco entradas no histórico. Link direto válido abre o momento correto; valor inválido abre Antes.
- [ ] Uma falha de imagem mantém orientação e ações; a legenda nunca descreve outra imagem por engano.
- [ ] A Carta mostra os 23 produtos em seis capítulos; o filtro não inventa dietas nem deixa blocos vazios inexplicáveis.
- [ ] “52 €/kg” e “29 €/pessoa · mínimo 2” estão completos em 320 px, sem cortar ou esconder a unidade.
- [ ] Slug inválido mostra erro útil. Dados ausentes não produzem origem, tempo ou fotografia de outro prato.
- [ ] Reserva demo não anuncia mesa guardada; disponibilidade não vem de fórmula pseudoaleatória.
- [ ] Formulário mantém valores após erro, mostra labels permanentes e não expõe dados pessoais na URL.
- [ ] Horário de domingo é consistente em header, Contactos e informação de chegada.
- [ ] Teclado alcança todos os controlos; foco é visível; menu devolve foco; leitor de ecrã recebe estado de seleção sem anúncios excessivos.
- [ ] `prefers-reduced-motion` desliga transições e não remove conteúdo. Conteúdo essencial não começa invisível à espera de JavaScript.
- [ ] O som nunca começa sozinho, para ao sair/ocultar e não recomeça sem toque.
- [ ] Em 320, 390, 768 e 1440 px não há scroll horizontal, texto cortado ou CTA tapado. Zoom a 200% mantém reflow utilizável.
- [ ] A barra inferior respeita a área segura e não cobre preço, condições ou ações. Não concorre com o teclado em Reservas.
- [ ] Fontes e imagens têm carregamento adequado; medidas reservadas evitam saltos relevantes. Uma fonte indisponível não torna textos invisíveis.

### 18.4 Evidência exigida na entrega do Claude

Entregar capturas desktop e mobile de Home, Carta, um Produto, Ambiente e Reservas, mais uma captura de Contactos para verificar consistência. Incluir os cinco estados da mesa numa folha comparativa, sem logos ou títulos; os três da sala noutra. A folha serve QA de continuidade, não é um moodboard.

Relatar os testes realizados, os problemas corrigidos e o que depende de dados reais. Não escrever “todos os critérios cumpridos” se só foram gerados ficheiros ou se as fotografias continuam como placeholders.

**Critério final:** a V3 deve continuar a sugerir esta casa quando retiramos o nome, a assinatura e os efeitos. Se só for reconhecível pelo logótipo ou pela legenda “Pátio do Ferro”, a revisão ainda não terminou.

---

## 19. Referências e limites da decisão

**Fontes de projeto:** pacote da segunda proposta anexado pelo utilizador; `DIRECAO-CRIATIVA.md`; páginas `.dc.html`; `carta-data.js`; `patio-motion.js`; `readme.md` e `styles.css` do sistema Organic. As dimensões, filtros, fallbacks e estados descritos na crítica foram obtidos desses arquivos. A miniatura exportada apoia a leitura da linguagem visual, mas não substitui testes de browser.

**Metodologia visual:** Biblioteca_Comandos_Visuais_ChatGPT_V2_Consolidada, conteúdo V2.1 consultado no contexto do projeto. A V3 seleciona comandos adequados à casa e não transforma a biblioteca num catálogo obrigatório de cenas.

**Fontes técnicas pontuais:**

- [Metadados oficiais de Archivo no Google Fonts](https://github.com/google/fonts/blob/main/ofl/archivo/METADATA.pb): família variável, eixos de peso/largura e referência de licença. Os valores concretos de uso neste documento são escolhas de direção, não prescrições da fonte.
- [W3C — Animation from Interactions](https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html): referência para permitir desligar movimento não essencial. Esse critério específico é nível AAA; a opção da V3 por movimento reduzido é uma regra de produto, não uma declaração automática de conformidade integral com WCAG.

A conclusão sobre caráter derivativo é uma avaliação crítica fundamentada na composição e na dependência explícita de um design system genérico. A proposta de autoria é uma direção a executar e testar. Este documento não a apresenta como originalidade empiricamente demonstrada, exclusividade jurídica ou site já construído.
