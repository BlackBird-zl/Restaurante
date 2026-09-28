// Pátio do Ferro — dados locais (modo template, sem Supabase). Restaurante fictício de demonstração.
// Estrutura preservada: categorias ordenadas → itens; slug = rota do produto (Produto.dc.html?p=slug).
// V3: preço com unidade explícita (unidade, minimo), porção só quando declarada, preparação em minutos só quando declarada.
window.PATIO = {
  casa: {
    nome: 'Pátio do Ferro',
    assinatura: 'A mesa pede tempo.',
    demo: true,
    morada: 'Rua de Demonstração, 00',
    cp: '4000-000 Porto',
    telefone: '+351 200 000 000',
    telefoneHref: 'tel:+351200000000',
    email: 'mesa@patiodoferro.example',
    // Fonte única de horário — header, Home, Contactos e Reservas leem daqui.
    horario: [
      { d: 'Segunda', h: 'Fechado', dias: [1], turnos: [] },
      { d: 'Terça a quinta', h: 'Jantar 19h00–23h00', dias: [2, 3, 4], turnos: [['19h00', '23h00']] },
      { d: 'Sexta e sábado', h: 'Almoço 12h30–15h00 · Jantar 19h00–00h00', dias: [5, 6], turnos: [['12h30', '15h00'], ['19h00', '00h00']] },
      { d: 'Domingo', h: 'Almoço 12h30–16h00', dias: [0], turnos: [['12h30', '16h00']] }
    ],
    espacos: [
      { v: 'sem', l: 'Sem preferência' },
      { v: 'sala', l: 'Sala' },
      { v: 'balcao', l: 'Balcão' },
      { v: 'patio', l: 'Pátio' }
    ]
  },
  carta: [
    { id: 'comecar', num: '01', nome: 'Para começar', intro: 'Para ir pedindo enquanto se escolhe o resto.',
      itens: [
        { slug: 'pao-fermentacao-lenta', nome: 'Pão de fermentação lenta', desc: 'Manteiga batida com ervas e flor de sal.', preco: 4.5, tags: ['vegetariano'] },
        { slug: 'azeitonas-britadas', nome: 'Azeitonas britadas', desc: 'Casca de laranja, oregãos, alho.', preco: 4, tags: ['vegan'] },
        { slug: 'pimentos-da-brasa', nome: 'Pimentos da brasa', desc: 'Pimentos pequenos tostados na grelha, flor de sal.', preco: 6.5, tags: ['vegan', 'da brasa'] },
        { slug: 'croquetes-alheira', nome: 'Croquetes de alheira', desc: 'Alheira, mostarda antiga, rábano.', preco: 7.5, tags: [] },
        { slug: 'pica-pau', nome: 'Pica-pau de novilho', desc: 'Cortado à faca, molho de cerveja preta, pickles da casa.', preco: 12, tags: ['para partilhar'] }
      ] },
    { id: 'brasa', num: '02', nome: 'Da brasa', intro: 'Grelha de ferro sobre brasa de lenha.', nota: 'A costeleta tem preparação aproximada de 40 min.',
      itens: [
        { slug: 'polvo-na-brasa', nome: 'Polvo na brasa', desc: 'Batata a murro, alho assado, azeite.', preco: 24, tags: ['da brasa'],
          longo: 'Cozido na véspera e levado à grelha no momento, até a pele tostar.',
          ingredientes: ['polvo', 'batata nova', 'alho assado', 'azeite', 'colorau fumado', 'salsa'], preparacao: 25, par: 'alvarinho-moncao', media: 'P01' },
        { slug: 'costeleta-maronesa', nome: 'Costeleta de maronesa', desc: 'Maturada 40 dias. Sal grosso.', preco: 68, porcao: 'Cerca de 1 kg · para duas pessoas', tags: ['da brasa', 'para partilhar'],
          longo: 'Grelhada sobre brasa baixa, fatiada e servida numa travessa ao centro da mesa.',
          ingredientes: ['costeleta de maronesa', 'sal grosso', 'pimenta preta'], preparacao: 40, par: 'tinto-douro', media: 'P02' },
        { slug: 'secretos-porco-preto', nome: 'Secretos de porco preto', desc: 'Migas de espargos, laranja amarga.', preco: 19, tags: ['da brasa'] },
        { slug: 'frango-do-campo', nome: 'Meio frango do campo', desc: 'Aberto, marinado de véspera, piri-piri da casa.', preco: 16, tags: ['da brasa'] },
        { slug: 'couve-coracao', nome: 'Couve coração-de-boi tostada', desc: 'Avelã, queijo da Ilha curado, manteiga noisette.', preco: 13, tags: ['vegetariano', 'da brasa'],
          longo: 'Cortada em quartos e tostada na grelha até as folhas de fora escurecerem.',
          ingredientes: ['couve coração-de-boi', 'avelã torrada', 'queijo da Ilha', 'manteiga', 'limão'], preparacao: 18, par: 'alvarinho-moncao', media: 'P03' }
      ] },
    { id: 'mar', num: '03', nome: 'Do mar', intro: 'Conforme o peixe do dia.', nota: 'O peixe do dia é pesado antes de ir à grelha.',
      itens: [
        { slug: 'peixe-do-dia', nome: 'Peixe do dia, inteiro', desc: 'Grelhado com escamas, molho de limão e salsa.', preco: 52, unidade: 'kg', tags: ['da brasa'] },
        { slug: 'arroz-carabineiro', nome: 'Arroz de carabineiro', desc: 'Malandrinho, coentros, lima.', preco: 29, unidade: 'pessoa', minimo: 2, tags: ['para partilhar'],
          longo: 'Arroz carolino cozido no caldo do carabineiro, servido no tacho.',
          ingredientes: ['carabineiro', 'arroz carolino', 'tomate', 'coentros', 'lima', 'piri-piri'], preparacao: 30, par: 'alvarinho-moncao', media: 'P04', mediaNota: 'Apresentação para duas pessoas.' },
        { slug: 'lulas-grelhadas', nome: 'Lulas grelhadas', desc: 'Tinta, limão queimado, pão frito.', preco: 18, tags: ['da brasa'] }
      ] },
    { id: 'horta', num: '04', nome: 'Da horta', intro: 'Para o centro da mesa.',
      itens: [
        { slug: 'batata-a-murro', nome: 'Batata a murro', desc: 'Alho, louro, azeite.', preco: 5, tags: ['vegan'] },
        { slug: 'tomate-coracao', nome: 'Tomate coração', desc: 'Cebola roxa, oregãos, azeite.', preco: 7, tags: ['vegan'] },
        { slug: 'grelos-salteados', nome: 'Grelos salteados', desc: 'Alho laminado, malagueta.', preco: 5.5, tags: ['vegan'] }
      ] },
    { id: 'ficar', num: '05', nome: 'Para ficar', intro: 'Sobremesas e queijo.',
      itens: [
        { slug: 'pudim-abade-priscos', nome: 'Pudim Abade de Priscos', desc: 'Gemas, açúcar, toucinho, vinho do Porto.', preco: 6.5, porcao: 'Uma porção', tags: [],
          longo: 'Receita tradicional de Braga. Contém toucinho — não é vegetariano.',
          ingredientes: ['gemas', 'açúcar', 'toucinho', 'vinho do Porto', 'casca de limão', 'canela'], par: 'porto-tawny', media: 'P05' },
        { slug: 'pera-bebeda', nome: 'Pera bêbeda', desc: 'Cozida em vinho tinto, natas batidas, canela.', preco: 6, tags: ['vegetariano'] },
        { slug: 'queijo-serra', nome: 'Queijo Serra da Estrela', desc: 'Amanteigado, compota de abóbora, tostas.', preco: 9, tags: ['vegetariano', 'para partilhar'] }
      ] },
    { id: 'copos', num: '06', nome: 'Copos', intro: 'Vinho a copo, 150 ml.',
      itens: [
        { slug: 'alvarinho-moncao', nome: 'Alvarinho', desc: 'Monção e Melgaço. Branco, mineral.', preco: 6, tags: [] },
        { slug: 'tinto-douro', nome: 'Tinto do Douro', desc: 'Touriga, fruta escura.', preco: 7, tags: [] },
        { slug: 'porto-tawny', nome: 'Porto Tawny 10 anos', desc: 'Noz, figo seco.', preco: 6.5, tags: [] },
        { slug: 'vermute-casa', nome: 'Vermute da casa', desc: 'Com laranja e gelo grande.', preco: 7, tags: [], media: 'B01' }
      ] }
  ]
};
window.PATIO.preco = function (it) {
  var p = typeof it === 'object' ? it.preco : it;
  var s = (typeof p === 'number' ? p.toFixed(p % 1 ? 2 : 0).replace('.', ',') : p) + ' €';
  if (it && it.unidade) s += '/' + it.unidade;
  if (it && it.minimo) s += ' · mínimo ' + it.minimo;
  return s;
};
window.PATIO.find = function (slug) {
  for (var i = 0; i < window.PATIO.carta.length; i++) {
    var c = window.PATIO.carta[i];
    for (var j = 0; j < c.itens.length; j++) if (c.itens[j].slug === slug) return { item: c.itens[j], cat: c };
  }
  return null;
};
window.PATIO.semCarneNemPeixe = function (it) { return it.tags.indexOf('vegetariano') > -1 || it.tags.indexOf('vegan') > -1; };
