# RESTAURANTE SAAS — Briefing da V1

Versão 1.0 · 27 de setembro de 2026 · Especificação para construção posterior

**Estado desta entrega:** produto especificado, sem implementação e sem imagens geradas. Os dados do restaurante de demonstração são fictícios. O nome comercial do SaaS permanece em aberto; usar `restaurant-os` apenas como identificador técnico.

## 1. Missão e leitura do pacote

Construir uma infraestrutura partilhada que entrega a cada restaurante um site próprio e uma operação leve de atendimento. O cliente descobre o restaurante em casa e, à mesa, continua dentro da mesma identidade visual para consultar a carta, pedir e chamar a equipa. Os funcionários recebem uma interface adequada ao seu trabalho; o proprietário controla conteúdo, carta, acesso e operação.

Este pacote repete o método do MARGEM: conceito definido, páginas reais, dados coerentes, direção visual específica, regras de interação, casos de erro e aceite verificável. A implementação anterior do MARGEM era essencialmente estática; este produto exige persistência, autenticação e concorrência reais. Não copiar a sua arquitetura técnica por analogia.

| Documento | Responsabilidade |
|---|---|
| `RESTAURANTE_SAAS_V1_Briefing.md` | Intenção, limites, utilizadores, requisitos e conteúdo do demo |
| `RESTAURANTE_SAAS_V1_Arquitetura_Produto.md` | Contratos de implementação: dados, permissões, estados, APIs, UX e imagens |
| `RESTAURANTE_SAAS_V1_Plano_Execucao_Claude.md` | Sequência de construção, dependências, testes e entrega |

Ler os três antes de alterar código. Para uma regra técnica, prevalece a Arquitetura; para prioridades e exclusões, prevalece este Briefing; o Plano determina a sequência, sem reduzir o escopo. A biblioteca visual anexada é referência de direção fotográfica. Os comandos são convenções de prompt, não funcionalidades do produto.

## 2. Problema, proposta e hipótese de valor

Hoje, a descoberta do restaurante, a carta, os pedidos da mesa e a equipa tendem a usar ferramentas e contextos separados. Um QR que apenas chama um funcionário resolve um momento, mas não organiza o restante atendimento. Um sistema de gestão completo pode acrescentar custos e complexidade desnecessários a um restaurante pequeno.

A proposta é ligar **presença digital → mesa → pedido/chamado → preparação → entrega → conta**, mantendo poucas decisões por ecrã. O proprietário consegue apresentar a marca e conduzir um serviço básico sem precisar de um ERP.

Hipóteses a validar num piloto: os clientes conseguem pedir sem explicação prolongada; cozinha e bar identificam o que lhes compete; chamados deixam de ser atendidos em duplicado; o dono percebe o estado da operação. Estas são hipóteses, não resultados comprovados ou promessas de aumento de faturação.

## 3. Decisões fechadas

| ID | Decisão da V1 |
|---|---|
| D01 | Aplicação web multi-tenant, um estabelecimento físico por tenant |
| D02 | Site público com páginas próprias; não é uma landing page da tecnologia |
| D03 | Um único código de aplicação e base PostgreSQL; dados isolados por restaurante |
| D04 | Mesa física permanente; cada grupo ocupa uma nova sessão de atendimento |
| D05 | QR identifica restaurante/mesa; código de seis dígitos do atendimento autoriza entrar e agir |
| D06 | Cliente sem conta, email ou telefone para pedir à mesa |
| D07 | Várias pessoas podem entrar na mesma sessão; carrinhos individuais e conta partilhada |
| D08 | Pedido validado entra diretamente nas estações, sem aceite manual obrigatório do salão |
| D09 | Cada produto tem exatamente uma estação: Cozinha ou Bar; outras estações fixas podem ser cadastradas |
| D10 | Estado de execução por linha do pedido; total da quantidade da linha avança junto |
| D11 | Entregas parciais entre linhas/estações são permitidas; não esperar o pedido inteiro |
| D12 | Conta única por atendimento; pagamento integral registado por funcionário, sem cobrança online |
| D13 | Conteúdo, preços e disponibilidade editáveis; pedidos guardam snapshots históricos |
| D14 | Papéis fixos: proprietário, administrador, salão, cozinha, bar e caixa; sem editor de permissões |
| D15 | Site personalizável por três presets e tokens controlados; sem editor de páginas livre |
| D16 | Reservas são pedidos sujeitos à confirmação humana; não há motor de disponibilidade |
| D17 | Português de Portugal, EUR e fuso Europe/Lisbon na V1 |
| D18 | Operação depende de ligação; sem filas de escrita offline ou promessa de push em segundo plano |
| D19 | Instalação multiutilizador funcional, com Supabase local para desenvolvimento e ambiente remoto para piloto |
| D20 | Tenant demo completo e segundo tenant mínimo para provar isolamento e mudança de identidade |

## 4. Utilizadores e personas operacionais

| Persona | Situação e objetivo | Interface principal | O que precisa ver primeiro |
|---|---|---|---|
| Visitante | Decide onde jantar pelo telemóvel | Site público | Comida, carta/preços, ambiente, horários e reserva |
| Cliente sentado | Uma mão no telemóvel; não quer criar conta | Contexto da mesa | Número da mesa, carta, carrinho, ajuda e estado do pedido |
| Marta, proprietária | Faz gestão fora do serviço e intervém em exceções | Administração | Pendências, recebimentos registados, carta e equipa |
| Rui, salão | Circula entre mesas e tem pouco tempo | Salão | Chamados novos, itens prontos, pedidos de conta |
| Inês, cozinha | Trabalha com ruído, calor e tablet fixo | KDS da cozinha | Mesa, quantidades, observações, tempo e próximo passo |
| Tomás, bar | Prepara bebidas e café | KDS do bar | Fila do bar, prioridades e itens prontos |
| Leonor, caixa | Confere o consumo e recebe no terminal externo | Caixa | Conta pedida, itens pendentes e total a receber |

O mesmo utilizador pode acumular papéis no mesmo restaurante; recebe a união das permissões, com menu adequado. Cozinha e bar nunca dependem de navegar pela administração para executar o trabalho.

## 5. Produto obrigatório e limites

### 5.1 Presença digital

Home, Carta, categoria, página de produto, Sobre, Ambiente, Reservas e Contactos. Horários e localização integram Contactos e rodapé; não criar páginas vazias para cada informação. Destaques e promoções editoriais integram Home/Carta e usam produtos existentes. O demo não usa descontos ou preços promocionais calculados.

Navegação, links diretos, refresh e metadados devem funcionar. A marca, fotografia e conteúdo vendem o restaurante. Não colocar funcionalidades SaaS, mockups de dashboards ou planos de subscrição na Home do restaurante.

### 5.2 Mesa e pedidos

QR por mesa, abertura de atendimento pelo salão, código presencial, entrada sem registo, carta com disponibilidade, observações curtas, carrinho local, envio idempotente e acompanhamento. O cliente vê o consumo partilhado da mesa sem identidade nem notas privadas dos outros dispositivos. Antes de enviar, a interface explicita que os itens entram na conta da mesa.

O cliente pode adicionar novas rodadas enquanto a conta estiver aberta. Depois do envio, não edita o pedido; chama a equipa para corrigir. O funcionário autorizado pode anular uma linha segundo o seu estado e permissão. A V1 não oferece variantes, extras pagos, menus compostos, cursos de refeição, quantidades fracionárias ou divisão de conta.

### 5.3 Operação

Salão com chamados, itens prontos e mesas; cozinha e bar com filas separadas; caixa com contas. Atribuição atómica impede que dois funcionários assumam o mesmo chamado ou recolham a mesma linha. Estado guardado no servidor; fechar o browser não apaga pedidos.

Produtos são roteados automaticamente. A estação fica gravada no pedido, pelo que alterar o cadastro não desloca um prato já em preparação. A equipa pode registar um pedido assistido para um cliente sem telemóvel pelo mesmo motor de validação.

### 5.4 Administração

Gerir identidade, conteúdo estruturado, media, carta, categorias, estações, mesas, QR, membros e funções. Consultar pedidos, chamados, contas, reservas e métricas. Estados de serviço: aberto para pedidos, pausado e fechado. Pausar novos pedidos não remove pedidos em curso nem impede pedir ajuda/conta.

O proprietário tem os direitos do administrador e a responsabilidade pela titularidade. Não criar console de cobrança SaaS, suporte com impersonação, auto-onboarding, faturação de subscrições ou um superadmin web na V1. Provisionamento de tenants fica num script restrito e documentado.

### 5.5 Analytics com significado

Mostrar pedidos submetidos, montantes recebidos registados, chamados, espera até alguém assumir, preparação por estação, filas em atraso, produtos mais pedidos, atividade por hora e por mesa. Cada indicador tem fórmula, intervalo e exclusões na Arquitetura. Sem previsões, IA analítica, funis de marketing ou atribuição de conversão.

Usar “Recebimentos registados” para o dinheiro marcado como recebido. Não o apresentar como faturação fiscal, receita auditada ou pagamento processado pelo produto.

### 5.6 Fora da V1

Contabilidade, faturação oficial, emissão fiscal, inventário, fichas técnicas de custos, fornecedores, folha salarial, integrações POS/delivery, pagamentos online, estornos financeiros, gorjetas, descontos, vouchers, fidelização, marketplace, app nativa, impressão térmica, agregação de filiais, encomendas para entrega e reservas automáticas por capacidade. Nenhuma dessas áreas terá botões decorativos a fingir funcionamento.

## 6. Princípios que orientam decisões

1. **A marca do restaurante vem primeiro.** A plataforma é infraestrutura discreta.
2. **Uma verdade operacional.** Interface pública e funcionários usam os mesmos preços, disponibilidade e pedidos.
3. **Contexto explícito.** Mesa, estado da ligação, responsável e próximo passo ficam visíveis.
4. **Poucas etapas e ações grandes.** Um funcionário deve reconhecer uma tarefa sem abrir três modais.
5. **Histórico preservado.** Edições de carta não reescrevem vendas ou pedidos anteriores.
6. **Ações financeiras conservadoras.** Não encerrar contas por timeout; nunca presumir pagamento.
7. **Isolamento comprovado.** Esconder botões não substitui autorização no servidor/base de dados.
8. **Feedback honesto.** “A enviar” não significa “Pedido recebido”; confirmar só depois do commit.
9. **Personalização finita.** Configurar marca e conteúdo sem permitir CSS, JS ou HTML arbitrários.
10. **Demonstração verdadeira.** Base de dados e várias sessões reais; não simular sincronização com temporizadores.

## 7. Restaurante de demonstração

### 7.1 Marca e conceito

**PÁTIO DO FERRO** · cozinha de brasa e mesa de bairro.

Restaurante fictício inspirado numa pequena casa urbana do Porto: paredes de cal clara, madeira escura, ferro pintado, louça de cerâmica branca irregular e apontamentos vinho. Cozinha portuguesa contemporânea, entradas para partilhar, pratos de brasa, legumes sazonais, sobremesas de casa, café e um pequeno bar.

Posicionamento: cuidado e acolhedor, com preços legíveis e linguagem direta. Não é fine dining cerimonial nem tasca caricatural. Público: casais, amigos e pequenos grupos que querem jantar com calma. Ticket não é prometido; deriva dos produtos que se escolherem.

Assinatura: **“A mesa pede tempo.”**

Paleta: papel `#F4F0E7`, tinta `#252820`, vinho `#6F3038`, verde seco `#5B654F`, linha `#D4CFC2`. Títulos Newsreader e texto/interface IBM Plex Sans, alojadas localmente com licenças. O wordmark é tipográfico, implementado em texto/SVG, não gerado numa fotografia.

Identidade fictícia, sem afirmar marca ou domínio disponível. A localização pública do demo é apenas “Porto · restaurante de demonstração”. Não inventar endereço visitável, telefone, reviews, prémios, equipa fotografada real ou origem certificada dos ingredientes. Contactos reais ficam nulos e os respetivos links ficam ocultos. Reservas no demo persistem como simulação, com aviso explícito e sem envio externo.

### 7.2 Horários ilustrativos

Terça a sábado: 12:00–15:00 e 19:00–23:00. Domingo: 12:00–16:00. Segunda: encerrado. O serviço de pedidos é aberto/fechado manualmente pela equipa; os horários públicos não encerram contas automaticamente. Data operacional muda às 05:00 em Europe/Lisbon.

### 7.3 Carta inicial: 24 produtos

Preços fictícios finais, guardados em cêntimos. `COZ` = Cozinha; `BAR` = Bar. A lista de alergénios é uma fixture do demo, não uma garantia alimentar. Na adaptação a um restaurante real, o responsável valida ingredientes e contaminação cruzada antes de publicar.

| ID / slug | Categoria | Produto e descrição curta | EUR | Estação | Alergénios declarados no demo |
|---|---|---|---:|---|---|
| P01 / pao-da-casa | Para começar | Pão da casa, manteiga de alho assado e azeite | 4,50 | COZ | Glúten, leite |
| P02 / croquetes-de-novilho | Para começar | Três croquetes de novilho com mostarda suave | 7,50 | COZ | Glúten, ovo, leite, mostarda |
| P03 / cogumelos-na-brasa | Para começar | Cogumelos de brasa com alho e salsa | 8,00 | COZ | Nenhum declarado |
| P04 / burrata-e-tomate | Para começar | Burrata, tomate assado e manjericão | 10,50 | COZ | Leite |
| P05 / pimentos-padron | Para começar | Pimentos Padrón com flor de sal | 6,50 | COZ | Nenhum declarado |
| P06 / vazia-na-brasa | Da brasa | Vazia de novilho, batata e molho de pimenta | 22,00 | COZ | Leite |
| P07 / polvo-na-brasa | Da brasa | Polvo de brasa, batata a murro e grelos | 23,50 | COZ | Moluscos |
| P08 / arroz-de-cogumelos | Da brasa | Arroz cremoso de cogumelos com queijo curado | 16,00 | COZ | Leite |
| P09 / frango-piri-piri | Da brasa | Meio frango de brasa, piri-piri à parte e batata | 15,50 | COZ | Nenhum declarado |
| P10 / hamburguer-do-patio | Da brasa | Hambúrguer, queijo, cebola e batata frita | 15,00 | COZ | Glúten, leite, ovo, mostarda |
| P11 / batata-frita | Ao lado | Batata frita com alecrim | 4,50 | COZ | Nenhum declarado |
| P12 / salada-da-horta | Ao lado | Folhas, tomate, pepino e vinagrete | 4,00 | COZ | Mostarda |
| P13 / legumes-na-brasa | Ao lado | Legumes sazonais de brasa | 5,50 | COZ | Nenhum declarado |
| P14 / tarte-de-amendoa | Para terminar | Tarte de amêndoa, nata pouco batida | 6,50 | COZ | Glúten, leite, ovo, amêndoa |
| P15 / mousse-de-chocolate | Para terminar | Mousse de chocolate e azeite | 5,50 | COZ | Ovo, leite |
| P16 / pera-assada | Para terminar | Pera assada com especiarias e iogurte | 6,00 | COZ | Leite |
| P17 / agua-filtrada | Copos e café | Água filtrada, garrafa de 75 cl | 2,50 | BAR | Nenhum declarado |
| P18 / limonada-da-casa | Copos e café | Limonada da casa, copo de 30 cl | 4,00 | BAR | Nenhum declarado |
| P19 / cola | Copos e café | Cola, copo de 33 cl | 3,00 | BAR | Nenhum declarado |
| P20 / cerveja | Copos e café | Cerveja à pressão, 30 cl | 3,50 | BAR | Glúten |
| P21 / vinho-tinto-copo | Copos e café | Vinho tinto da casa, copo de 15 cl | 5,00 | BAR | Sulfitos |
| P22 / porto-tonico | Copos e café | Porto branco, tónica, gelo e limão | 7,50 | BAR | Sulfitos |
| P23 / espresso | Copos e café | Espresso | 1,80 | BAR | Nenhum declarado |
| P24 / cappuccino | Copos e café | Espresso e leite vaporizado | 3,20 | BAR | Leite |

Atributos adicionais do seed: `is_vegetarian=true` para P03, P04, P05, P08, P11–P16; bebidas sem classificação alimentar publicitária. `contains_alcohol=true` em P20–P22. P07 inicialmente esgotado para demonstrar disponibilidade; todos os outros disponíveis. P06, P08 e P14 são destaques da Home; o produto esgotado continua consultável com envio desativado. Observações não alteram receita ou alergénios e não implicam aceitação automática de adaptações.

Categorias, nesta ordem: `para-comecar`, `da-brasa`, `ao-lado`, `para-terminar`, `copos-e-cafe`. Cada ficha terá uma capa própria; não reutilizar uma imagem genérica para produtos diferentes.

### 7.4 Mesas e equipa

14 mesas, 44 lugares: 01–06 com dois lugares; 07–12 com quatro; 13–14 com quatro na zona Pátio. As mesas 01–12 ficam na zona Sala. A zona é filtro, não um mapa drag-and-drop. Capacidade informa a equipa; não limita quantas pessoas podem escanear o QR.

| Pessoa fictícia | Identificador de login para seed local | Papel |
|---|---|---|
| Marta Azevedo | marta@patio.example | Proprietária |
| Diogo Reis | diogo@patio.example | Administrador |
| Rui Matos | rui@patio.example | Salão |
| Sara Vale | sara@patio.example | Salão |
| Inês Rocha | ines@patio.example | Cozinha; estação COZ |
| Tomás Cruz | tomas@patio.example | Bar; estação BAR |
| Leonor Alves | leonor@patio.example | Caixa |

Usar domínio reservado `.example`, nenhuma pessoa real. As palavras-passe de teste são geradas/fornecidas por variável no ambiente local, nunca publicadas no repositório nem partilhadas por padrão entre funções. Não ativar estas credenciais numa instância de produção aberta ao público.

### 7.5 Dados operacionais demonstráveis

Seed com relógio de referência `T0`, definido em execução, e valores determinísticos. Não somar registos de exemplo novamente a cada arranque. Fixtures pormenorizadas e cenários de teste estão no Plano.

- Mesa 08: pedido misto P10 ×2, P11 ×1, P19 ×2; total **40,50 €**. Cozinha em preparação, bebidas prontas.
- Mesa 04: chamado “Talheres”, novo há dois minutos; pedido entregue P06 ×1, P18 ×1; **26,00 €**.
- Mesa 12: P08 ×2 e P17 ×1, entregues; conta pedida; **34,50 €**.
- Mesa 07: P06 ×1 e P21 ×1, entregues; atendimento ainda aberto; **27,00 €**; chamado de ajuda assumido pelo Rui.
- Mesa 02: atendimento encerrado, P10 ×2 e P19 ×2; **36,00 €** recebidos por cartão externo.
- Mesa 03: atendimento encerrado, P08 ×1 e P18 ×1; **20,00 €** recebidos em numerário.
- Restantes mesas livres. Mesa 14 é usada no roteiro de demonstração de ponta a ponta.
- Duas reservas fictícias para o próximo dia de abertura: uma pendente às 13:00, uma confirmada às 13:30; nomes de exemplo e contactos `.example`, sem notificações.
- Segundo tenant `balcao-do-largo`: identidade café clara, duas mesas, quatro produtos, utilizador próprio e um pedido. Fixture técnica de isolamento, não um segundo restaurante comercial completo.

Os **56,00 €** recebidos nas duas contas encerradas são a referência inicial da métrica de recebimentos do dia operacional do seed. Pedidos abertos não entram nesse valor.

## 8. Conteúdo pronto para a Home

| Ordem | Bloco | Conteúdo e comportamento |
|---|---|---|
| 1 | Hero fotográfico | Eyebrow “COZINHA DE BRASA · PORTO”; H1 “A mesa pede tempo.”; texto “Brasa acesa, pratos para partilhar e espaço para ficar.”; CTA principal “Ver a carta”; secundário “Pedir reserva” |
| 2 | Apresentação | Título “Cozinhamos para ficar à mesa.” Texto: “Começamos pelo pão, deixamos a brasa fazer o seu trabalho e servimos sem cerimónia. No Pátio do Ferro, há espaço para um almoço demorado, um jantar a dois ou mais um copo com amigos.” |
| 3 | Da cozinha | Três produtos reais da carta: Vazia na brasa, Arroz de cogumelos, Tarte de amêndoa; preços lidos do cadastro; links para as fichas; botão “Explorar a carta” |
| 4 | Ambiente | Fotografia ampla da Sala e detalhe do Pátio; título “Uma casa aberta à conversa.”; texto “Madeira, luz de janela e mesas que aproximam. A sala acolhe; o pátio convida a prolongar.”; link “Conhecer o espaço” |
| 5 | Do bar | Porto tónico e espresso, com fotografias próprias; título “Antes do jantar. Depois da sobremesa.”; link para Copos e café |
| 6 | Visita | Horários estruturados, “Porto · restaurante de demonstração”, CTA “Pedir reserva”; sem mapa ou telefone inventados |
| 7 | Rodapé | Navegação, horários, privacidade e “Restaurante fictício criado para demonstrar a plataforma.” |

Sobre: “O Pátio do Ferro é uma casa imaginada à volta de duas coisas simples: o calor da brasa e o tempo à mesa. A carta junta pratos reconhecíveis, legumes de estação e pequenas escolhas para partilhar. A sala foi pensada para receber sem pressa, do primeiro pão ao último café.” Exibir nota discreta de conceito demonstrativo.

Reservas: título “Guardamos lugar para a conversa.” Apoio “Envie a data, a hora e o número de pessoas. A reserva só fica confirmada após contacto da equipa.” No demo, acrescentar junto ao formulário: “Simulação: use dados fictícios. Não será efetuada uma reserva real.”

Contexto da mesa: “Está na Mesa 14”; “Os pedidos são adicionados à conta desta mesa”; ações “Ver a carta”, “Chamar equipa”, “Pedir a conta”. Evitar slogans e banners nesta experiência.

## 9. Direção visual e mobile

O site público é editorial e fotográfico, com composição variada e ritmo. A carta privilegia leitura e preços; a mesa remove navegação institucional excessiva; os painéis de operação privilegiam tempo, quantidade e ação. O backoffice usa tabelas, formulários e hierarquia estável, sem decoração de SaaS.

O núcleo visual partilhado está nos componentes acessíveis e nos tokens. O restaurante controla preset, fontes permitidas, paleta validada, logo, recortes, fotografias e textos. O sistema de estados operacionais mantém cores semânticas comuns para todos os tenants; um tema vinho não torna erros, sucesso e ações indistinguíveis.

Requisitos de uso: conteúdos sem overflow a 360 px, alvos de 48 px na mesa/salão e de 56 px no KDS, suporte a safe areas e texto ampliado, botões com texto, feedback de rede e estado sempre escrito. No KDS, relógio e quantidade são legíveis a alguma distância. Não depender de hover, cor, som ou gestos ocultos.

A biblioteca anexada, identificada internamente como **V2.1 consolidada**, orienta fotografias com cinco camadas. Usar principalmente família FOTO: comida, bebida, interiores e serviço realista. Os 32 assets previstos, as composições, os prompts e a ordem de produção estão na Arquitetura. Não gerar imagens nesta fase.

## 10. Diferenciação controlada

O valor não depende de adicionar funcionalidades em todas as direções. A diferenciação concreta está em três ligações:

- Site e mesa compartilham identidade, dados e catálogo, preservando a experiência oficial da marca.
- Um envio com comida e bebida cria trabalho separado para cozinha e bar e depois volta ao salão por item pronto.
- O proprietário edita marca/conteúdo sem quebrar os contratos operacionais e sem clonar o código por restaurante.

O demo principal usa preset **Casa editorial**. A V1 inclui também **Balcão claro** e **Noite gráfica**, com variações de composição e tipografia, não só alteração da cor do botão. Estes presets servem restaurantes italianos, cafés, hamburguerias, pizzarias e bares por adaptação de conteúdo; não implicam construir cinco produtos distintos.

## 11. Sucesso da V1 e piloto

Aceite de construção: outro agente consegue executar a instalação local, entrar com cada função, operar a Mesa 14 em vários browsers/dispositivos, completar pedidos mistos, chamar equipa, pedir e fechar conta, alterar um preço sem alterar pedidos anteriores, testar tenant B e mudar preset sem mexer no core.

Metas de projeto a medir, sem afirmar resultados prévios: pelo menos 95% das atualizações visíveis até dois segundos em ligação saudável; recuperação por polling até cinco segundos quando o canal realtime falhar; zero linhas/pagamentos duplicados nos testes de retry; zero leitura ou escrita entre tenants nos testes negativos. O cliente usa polling de três segundos para o acompanhamento.

Piloto sugerido: um restaurante, um turno supervisionado, dispositivos já usados pela equipa, QR e código do atendimento visíveis, processo manual existente disponível se a internet falhar. Registar dificuldades concretas antes de acrescentar funções. A V1 completa é maior do que um MVP de fim de semana; uma demonstração visual em 48–72 horas não comprova operação segura multi-tenant.

## 12. Roadmap por evidência

| Etapa | Possível evolução | Condição para avançar |
|---|---|---|
| V1.1 | Variantes/extras, correções mais finas, divisão de linhas | Pedidos reais mostram frequência e impacto dessas necessidades |
| V1.2 | Divisão de conta, pagamentos integrados, impressão | Caixa e operação estabilizados; regras financeiras/fiscais definidas com os responsáveis |
| V2 | POS, delivery, fidelização simples, reservas por capacidade | Integração comercial escolhida e volume que justifique manutenção |
| Posterior | Stock, custos, várias filiais e automações | Procura comprovada; novo escopo próprio |

Não preparar funcionalidades incompletas desses módulos dentro da V1. Deixar fronteiras de domínio claras, migrations versionadas e eventos operacionais suficientes para evolução.
