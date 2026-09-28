/**
 * BALCÃO DO LARGO — minimal second tenant for isolation and identity tests (Plano §4.2).
 * Shares the product slug `espresso` and table labels 01/02 with Pátio do Ferro on purpose.
 */
export const balcao = {
  slug: 'balcao-do-largo',
  name: 'Balcão do Largo',
  namespace: 'c4e8a1f2-7b3d-4e9a-8c21-5d6f0a9b3e42',
  preset: 'balcao-claro' as const,
  tokens: {
    color: { background: '#FAF7F2', surface: '#FFFFFF', text: '#1F2328', muted: '#57606A', accent: '#9A4A1F', border: '#E3DED5' },
    fontPair: 'plex-only', radius: '8', density: 'compact',
  },
  weeklyHours: {
    mon: [['08:00', '18:00']], tue: [['08:00', '18:00']], wed: [['08:00', '18:00']], thu: [['08:00', '18:00']],
    fri: [['08:00', '18:00']], sat: [['09:00', '13:00']], sun: [],
  },
  publicContacts: { phone: null, email: null, addressLine: null, city: 'Lisboa · café de demonstração', mapUrl: null, instagram: null },
  stations: [
    { key: 'BAR', code: 'BAR', name: 'Balcão', kind: 'bar', target: 4, sort: 1 },
    { key: 'COZ', code: 'COZ', name: 'Cozinha', kind: 'kitchen', target: 10, sort: 2 },
  ],
  categories: [
    { slug: 'cafe', name: 'Café', description: 'Tirado ao balcão.' },
    { slug: 'padaria', name: 'Padaria', description: 'Da fornada da manhã.' },
  ],
  items: [
    ['B01', 'espresso', 'cafe', 'Espresso', 'Café curto, tirado na hora.', 'Café espresso.', 90, 'BAR', [], false, false],
    ['B02', 'galao', 'cafe', 'Galão', 'Café com leite em copo alto.', 'Café, leite.', 160, 'BAR', ['leite'], false, false],
    ['B03', 'pastel-de-nata', 'padaria', 'Pastel de nata', 'Massa folhada e creme de ovo.', 'Farinha de trigo, manteiga, ovo, leite, açúcar.', 130, 'COZ', ['gluten', 'ovos', 'leite'], true, false],
    ['B04', 'torrada', 'padaria', 'Torrada', 'Pão de forma torrado com manteiga.', 'Pão de forma, manteiga.', 180, 'COZ', ['gluten', 'leite'], true, false],
  ] as const,
  tables: [
    { label: '01', seats: 2, zone: 'Balcão', sort: 1 },
    { label: '02', seats: 2, zone: 'Balcão', sort: 2 },
  ],
  staff: [
    { key: 'joana', name: 'Joana Pires', email: 'joana@balcao.example', roles: ['admin'], owner: true, stations: [] as string[] },
  ],
  pages: {
    home: {
      hero: { eyebrow: 'CAFÉ · PADARIA', title: 'Bom dia no largo.', body: 'Café tirado ao balcão e pão da fornada da manhã.',
        mediaId: null, primaryLink: 'carta', primaryLabel: 'Ver a carta', secondaryLink: 'contactos', secondaryLabel: 'Horários' },
      intro: { title: 'Um balcão para começar o dia.', body: 'Café de demonstração criado para provar que cada restaurante tem a sua marca, a sua carta e os seus dados.' },
      featured: { title: 'Ao balcão', ctaLabel: 'Ver tudo' },
      featuredItemIds: ['@item:B01', '@item:B03', '@item:B02'],
      ambience: { title: 'Pequeno e luminoso.', body: 'Seis bancos, uma montra e o largo lá fora.', mediaIds: [], linkLabel: 'Sobre nós' },
      bar: { title: 'Para levar o dia com calma.', itemIds: ['@item:B02', '@item:B04'], mediaIds: [], linkLabel: 'Café' },
      visit: { title: 'Horário', body: 'Lisboa · café de demonstração' },
      footer: { note: 'Café fictício criado para demonstrar a plataforma.' },
    },
    about: { title: 'Sobre o Balcão do Largo', intro: 'Um café de bairro fictício.', paragraphs: ['Existe para demonstrar isolamento entre restaurantes.', 'Não é um estabelecimento real.'], mediaIds: [], conceptNote: 'Café fictício de demonstração.' },
    ambience: { title: 'O espaço', intro: 'Balcão de madeira clara e seis bancos.', images: [] },
    contact: { title: 'Horário', intro: 'Café de demonstração sem morada visitável.' },
    reservations: { title: 'Reservas', body: 'O Balcão do Largo não aceita reservas: é só chegar.', demoNotice: 'Simulação: use dados fictícios.' },
    privacy: { title: 'Privacidade', sections: [{ title: 'Dados', body: 'Café de demonstração: não recolhe dados além dos pedidos feitos à mesa, sem identificar a pessoa.' }] },
  },
};

/** Extra account used to prove roles do not travel between tenants (admin in A, bar in B). */
export const multiTenantUser = { key: 'multi', name: 'Teste Multi', email: 'multi@teste.example' };
