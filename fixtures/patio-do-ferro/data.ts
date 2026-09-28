/**
 * PÁTIO DO FERRO — demo tenant data (Briefing §7–8, Plano §4).
 * Fictitious restaurant. Contacts are intentionally null. Prices in cents.
 */
export const patio = {
  slug: 'patio-do-ferro',
  name: 'Pátio do Ferro',
  namespace: '6b1d7a9e-2f1c-4c55-9a4f-0e9a1c3b7d11',
  preset: 'casa-editorial' as const,
  tokens: {
    color: { background: '#F4F0E7', surface: '#FBF8F1', text: '#252820', muted: '#555E4A', accent: '#6F3038', border: '#D4CFC2' },
    fontPair: 'newsreader-plex', radius: '0', density: 'comfortable',
  },
  weeklyHours: {
    mon: [], tue: [['12:00', '15:00'], ['19:00', '23:00']], wed: [['12:00', '15:00'], ['19:00', '23:00']],
    thu: [['12:00', '15:00'], ['19:00', '23:00']], fri: [['12:00', '15:00'], ['19:00', '23:00']],
    sat: [['12:00', '15:00'], ['19:00', '23:00']], sun: [['12:00', '16:00']],
  },
  publicContacts: { phone: null, email: null, addressLine: null, city: 'Porto · restaurante de demonstração', mapUrl: null, instagram: null },
  stations: [
    { key: 'COZ', code: 'COZ', name: 'Cozinha', kind: 'kitchen', target: 15, sort: 1 },
    { key: 'BAR', code: 'BAR', name: 'Bar', kind: 'bar', target: 5, sort: 2 },
  ],
  categories: [
    { slug: 'para-comecar', name: 'Para começar', description: 'Pão, pequenas coisas da brasa e pratos para dividir enquanto a conversa aquece.' },
    { slug: 'da-brasa', name: 'Da brasa', description: 'Os pratos principais passam pelo carvão. Porções para uma pessoa, servidas sem pressa.' },
    { slug: 'ao-lado', name: 'Ao lado', description: 'Acompanhamentos para completar a mesa.' },
    { slug: 'para-terminar', name: 'Para terminar', description: 'Sobremesas de casa, feitas cada manhã.' },
    { slug: 'copos-e-cafe', name: 'Copos e café', description: 'Do primeiro copo ao último café.' },
  ],
  // [id, slug, category, name, description, ingredients, priceCents, station, allergens, vegetarian, alcohol]
  items: [
    ['P01', 'pao-da-casa', 'para-comecar', 'Pão da casa', 'Pão da casa com manteiga de alho assado e azeite.', 'Pão de fermentação lenta, manteiga, alho assado, azeite virgem extra.', 450, 'COZ', ['gluten', 'leite'], false, false],
    ['P02', 'croquetes-de-novilho', 'para-comecar', 'Croquetes de novilho', 'Três croquetes de novilho com mostarda suave.', 'Novilho estufado, pão ralado, ovo, leite, mostarda suave.', 750, 'COZ', ['gluten', 'ovos', 'leite', 'mostarda'], false, false],
    ['P03', 'cogumelos-na-brasa', 'para-comecar', 'Cogumelos na brasa', 'Cogumelos de brasa com alho e salsa.', 'Cogumelos, alho, salsa, azeite, flor de sal.', 800, 'COZ', [], true, false],
    ['P04', 'burrata-e-tomate', 'para-comecar', 'Burrata e tomate', 'Burrata, tomate assado e manjericão.', 'Burrata, tomate assado, manjericão, azeite.', 1050, 'COZ', ['leite'], true, false],
    ['P05', 'pimentos-padron', 'para-comecar', 'Pimentos Padrón', 'Pimentos Padrón com flor de sal.', 'Pimentos Padrón, azeite, flor de sal.', 650, 'COZ', [], true, false],
    ['P06', 'vazia-na-brasa', 'da-brasa', 'Vazia na brasa', 'Vazia de novilho, batata e molho de pimenta.', 'Vazia de novilho, batata, molho de pimenta com natas.', 2200, 'COZ', ['leite'], false, false],
    ['P07', 'polvo-na-brasa', 'da-brasa', 'Polvo na brasa', 'Polvo de brasa, batata a murro e grelos.', 'Polvo, batata a murro, grelos, alho, azeite.', 2350, 'COZ', ['moluscos'], false, false],
    ['P08', 'arroz-de-cogumelos', 'da-brasa', 'Arroz de cogumelos', 'Arroz cremoso de cogumelos com queijo curado.', 'Arroz carolino, cogumelos, caldo de legumes, queijo curado, manteiga.', 1600, 'COZ', ['leite'], true, false],
    ['P09', 'frango-piri-piri', 'da-brasa', 'Frango piri-piri', 'Meio frango de brasa, piri-piri à parte e batata.', 'Meio frango, batata, piri-piri servido à parte.', 1550, 'COZ', [], false, false],
    ['P10', 'hamburguer-do-patio', 'da-brasa', 'Hambúrguer do Pátio', 'Hambúrguer, queijo, cebola e batata frita.', 'Carne de novilho, pão brioche, queijo, cebola, maionese de mostarda, batata frita.', 1500, 'COZ', ['gluten', 'leite', 'ovos', 'mostarda'], false, false],
    ['P11', 'batata-frita', 'ao-lado', 'Batata frita', 'Batata frita com alecrim.', 'Batata, alecrim, sal.', 450, 'COZ', [], true, false],
    ['P12', 'salada-da-horta', 'ao-lado', 'Salada da horta', 'Folhas, tomate, pepino e vinagrete.', 'Folhas, tomate, pepino, vinagrete de mostarda.', 400, 'COZ', ['mostarda'], true, false],
    ['P13', 'legumes-na-brasa', 'ao-lado', 'Legumes na brasa', 'Legumes sazonais de brasa.', 'Courgette, cenoura e cebola da estação, azeite.', 550, 'COZ', [], true, false],
    ['P14', 'tarte-de-amendoa', 'para-terminar', 'Tarte de amêndoa', 'Tarte de amêndoa, nata pouco batida.', 'Amêndoa, farinha de trigo, manteiga, ovo, açúcar, nata.', 650, 'COZ', ['gluten', 'leite', 'ovos', 'frutos_casca_rija'], true, false],
    ['P15', 'mousse-de-chocolate', 'para-terminar', 'Mousse de chocolate', 'Mousse de chocolate e azeite.', 'Chocolate negro, ovo, natas, azeite, flor de sal.', 550, 'COZ', ['ovos', 'leite'], true, false],
    ['P16', 'pera-assada', 'para-terminar', 'Pera assada', 'Pera assada com especiarias e iogurte.', 'Pera, canela, cravinho, iogurte natural.', 600, 'COZ', ['leite'], true, false],
    ['P17', 'agua-filtrada', 'copos-e-cafe', 'Água filtrada', 'Água filtrada, garrafa de 75 cl.', 'Água filtrada, 75 cl.', 250, 'BAR', [], false, false],
    ['P18', 'limonada-da-casa', 'copos-e-cafe', 'Limonada da casa', 'Limonada da casa, copo de 30 cl.', 'Limão, açúcar, água, gelo. 30 cl.', 400, 'BAR', [], false, false],
    ['P19', 'cola', 'copos-e-cafe', 'Cola', 'Cola, copo de 33 cl.', 'Refrigerante de cola, gelo. 33 cl.', 300, 'BAR', [], false, false],
    ['P20', 'cerveja', 'copos-e-cafe', 'Cerveja', 'Cerveja à pressão, 30 cl.', 'Cerveja à pressão. 30 cl.', 350, 'BAR', ['gluten'], false, true],
    ['P21', 'vinho-tinto-copo', 'copos-e-cafe', 'Vinho tinto a copo', 'Vinho tinto da casa, copo de 15 cl.', 'Vinho tinto da casa. 15 cl.', 500, 'BAR', ['sulfitos'], false, true],
    ['P22', 'porto-tonico', 'copos-e-cafe', 'Porto tónico', 'Porto branco, tónica, gelo e limão.', 'Vinho do Porto branco, água tónica, gelo, casca de limão.', 750, 'BAR', ['sulfitos'], false, true],
    ['P23', 'espresso', 'copos-e-cafe', 'Espresso', 'Espresso.', 'Café espresso.', 180, 'BAR', [], false, false],
    ['P24', 'cappuccino', 'copos-e-cafe', 'Cappuccino', 'Espresso e leite vaporizado.', 'Café espresso, leite vaporizado.', 320, 'BAR', ['leite'], false, false],
  ] as const,
  unavailable: ['P07'],
  // 14 tables, 44 seats: 01–06 two seats, 07–12 four seats (Sala), 13–14 four seats (Pátio)
  tables: Array.from({ length: 14 }, (_, i) => {
    const n = i + 1;
    const label = String(n).padStart(2, '0');
    return { label, seats: n <= 6 ? 2 : 4, zone: n <= 12 ? 'Sala' : 'Pátio', sort: n };
  }),
  staff: [
    { key: 'marta', name: 'Marta Azevedo', email: 'marta@patio.example', roles: ['admin'], owner: true, stations: [] as string[] },
    { key: 'diogo', name: 'Diogo Reis', email: 'diogo@patio.example', roles: ['admin'], owner: false, stations: [] as string[] },
    { key: 'rui', name: 'Rui Matos', email: 'rui@patio.example', roles: ['floor'], owner: false, stations: [] as string[] },
    { key: 'sara', name: 'Sara Vale', email: 'sara@patio.example', roles: ['floor'], owner: false, stations: [] as string[] },
    { key: 'ines', name: 'Inês Rocha', email: 'ines@patio.example', roles: ['kitchen'], owner: false, stations: ['COZ'] },
    { key: 'tomas', name: 'Tomás Cruz', email: 'tomas@patio.example', roles: ['bar'], owner: false, stations: ['BAR'] },
    { key: 'leonor', name: 'Leonor Alves', email: 'leonor@patio.example', roles: ['cashier'], owner: false, stations: [] as string[] },
  ],
  pages: {
    home: {
      hero: {
        eyebrow: 'COZINHA DE BRASA · PORTO', title: 'A mesa pede tempo.',
        body: 'Brasa acesa, pratos para partilhar e espaço para ficar.',
        mediaId: '@media:01', primaryLink: 'carta', primaryLabel: 'Ver a carta', secondaryLink: 'reservas', secondaryLabel: 'Pedir reserva',
      },
      intro: {
        title: 'Cozinhamos para ficar à mesa.',
        body: 'Começamos pelo pão, deixamos a brasa fazer o seu trabalho e servimos sem cerimónia. No Pátio do Ferro, há espaço para um almoço demorado, um jantar a dois ou mais um copo com amigos.',
        signature: 'A mesa pede tempo.',
      },
      featured: { title: 'Da cozinha', ctaLabel: 'Explorar a carta' },
      featuredItemIds: ['@item:P06', '@item:P08', '@item:P14'],
      ambience: {
        title: 'Uma casa aberta à conversa.',
        body: 'Madeira, luz de janela e mesas que aproximam. A sala acolhe; o pátio convida a prolongar.',
        mediaIds: ['@media:02', '@media:03'], linkLabel: 'Conhecer o espaço',
      },
      bar: { title: 'Antes do jantar. Depois da sobremesa.', itemIds: ['@item:P22', '@item:P23'], mediaIds: ['@media:07'], linkLabel: 'Copos e café' },
      visit: { title: 'Visite-nos', body: 'Porto · restaurante de demonstração' },
      footer: { note: 'Restaurante fictício criado para demonstrar a plataforma.' },
    },
    about: {
      title: 'Sobre o Pátio do Ferro',
      intro: 'O Pátio do Ferro é uma casa imaginada à volta de duas coisas simples: o calor da brasa e o tempo à mesa.',
      signature: 'A mesa pede tempo.',
      paragraphs: [
        'A carta junta pratos reconhecíveis, legumes de estação e pequenas escolhas para partilhar.',
        'A sala foi pensada para receber sem pressa, do primeiro pão ao último café.',
      ],
      mediaIds: ['@media:04', '@media:05'],
      conceptNote: 'O Pátio do Ferro é um restaurante fictício, criado para demonstrar a plataforma. Pessoas, fotografias e contactos não correspondem a um estabelecimento real.',
    },
    ambience: {
      title: 'O espaço',
      intro: 'Uma sala de paredes claras, madeira escura e ferro pintado, com um pequeno pátio aberto ao céu e um balcão para o primeiro copo.',
      images: [
        { mediaId: '@media:02', caption: 'A sala, com luz de janela durante o dia.' },
        { mediaId: '@media:03', caption: 'O pátio: três mesas e céu aberto.' },
        { mediaId: '@media:08', caption: 'O balcão ao início da noite.' },
        { mediaId: '@media:06', caption: 'Pequenas coisas para partilhar.' },
      ],
    },
    contact: { title: 'Contactos e horários', intro: 'Estamos no Porto — numa morada imaginada. Este restaurante de demonstração não tem telefone, email ou morada visitável.' },
    reservations: {
      title: 'Guardamos lugar para a conversa.',
      body: 'Envie a data, a hora e o número de pessoas. A reserva só fica confirmada após contacto da equipa.',
      demoNotice: 'Simulação: use dados fictícios. Não será efetuada uma reserva real.',
    },
    privacy: {
      title: 'Privacidade',
      sections: [
        { title: 'Quem trata os dados', body: 'Este site pertence a um restaurante de demonstração fictício. Numa instalação real, o restaurante identifica aqui o responsável pelo tratamento e o contacto para questões de privacidade.' },
        { title: 'Pedidos de reserva', body: 'Guardamos o nome, o contacto indicado, a data, a hora, o número de pessoas e a nota opcional para que a equipa possa confirmar o pedido. Estes dados são anonimizados 90 dias após a data pedida. Não enviamos mensagens automáticas.' },
        { title: 'Pedidos à mesa', body: 'Para pedir à mesa não é necessária conta, email ou telefone. O navegador guarda um cookie técnico da sessão da mesa, que deixa de funcionar quando o atendimento termina. Os pedidos e a conta ficam registados para a operação do restaurante, sem identificar a pessoa.' },
        { title: 'Cookies e medição', body: 'Não usamos cookies de publicidade nem ferramentas de medição de terceiros. Os endereços IP não são guardados em claro; um valor cifrado diário serve apenas para limitar abusos.' },
        { title: 'Os seus direitos', body: 'Numa instalação real, pode pedir acesso, correção ou eliminação dos seus dados através do contacto indicado pelo restaurante. Este texto descreve o funcionamento da plataforma e não constitui uma declaração de conformidade jurídica.' },
      ],
    },
  },
};

export type PatioItem = (typeof patio.items)[number];
