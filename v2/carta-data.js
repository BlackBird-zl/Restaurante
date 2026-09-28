// Pátio do Ferro — dados locais da carta (modo template, sem Supabase).
// Estrutura: categorias ordenadas → itens. slug é a rota do produto (Produto.dc.html?p=slug).
window.PATIO = {
  casa: {
    nome: 'Pátio do Ferro',
    assinatura: 'A mesa pede tempo.',
    morada: 'Rua do Bonjardim, 418',
    cp: '4000-116 Porto',
    telefone: '+351 220 000 418',
    email: 'mesa@patiodoferro.pt',
    horario: [
      { d: 'Segunda', h: 'Fechado — a brasa descansa' },
      { d: 'Terça a quinta', h: '19h00 — 23h00' },
      { d: 'Sexta e sábado', h: '12h30 — 15h00 · 19h00 — 00h00' },
      { d: 'Domingo', h: '12h30 — 16h00' }
    ]
  },
  carta: [
    { id: 'comecar', num: 'I', nome: 'Para começar', intro: 'Pão, azeite e o que a mão alcança enquanto se escolhe o resto.', img: 'Pão rasgado à mão sobre linho, migalhas, azeite num prato de barro',
      itens: [
        { slug: 'pao-fermentacao-lenta', nome: 'Pão de fermentação lenta', desc: 'Manteiga batida com ervas da horta e flor de sal.', preco: 4.5, tags: ['vegetariano'] },
        { slug: 'azeitonas-britadas', nome: 'Azeitonas britadas', desc: 'Casca de laranja, oregãos secos ao sol, alho.', preco: 4, tags: ['vegan'] },
        { slug: 'pimentos-da-brasa', nome: 'Pimentos da brasa', desc: 'Pimentos pequenos, tostados na grelha, flor de sal.', preco: 6.5, tags: ['vegan', 'da brasa'] },
        { slug: 'croquetes-alheira', nome: 'Croquetes de alheira', desc: 'Alheira de Mirandela, mostarda antiga, rábano.', preco: 7.5, tags: [] },
        { slug: 'pica-pau', nome: 'Pica-pau de novilho', desc: 'Cortado à faca, molho de cerveja preta, pickles da casa.', preco: 12, tags: ['para partilhar'] }
      ] },
    { id: 'brasa', num: 'II', nome: 'Da brasa', intro: 'Lenha de azinho, grelha de ferro fundido e o tempo que cada peça pede.', img: 'Grelha de ferro sobre brasa viva, fumo a subir, mão com pinça ao canto',
      itens: [
        { slug: 'polvo-na-brasa', nome: 'Polvo na brasa', desc: 'Batata a murro, alho assado, azeite de Trás-os-Montes.', preco: 24, tags: ['da brasa', 'da casa'], destaque: true,
          longo: 'Cozido devagar na véspera, arrefecido no próprio caldo e só depois levado à grelha, onde ganha a pele tostada que estala. Chega à mesa inteiro, sobre batata esmagada com a palma da mão.',
          ingredientes: ['Polvo de Matosinhos', 'Batata nova', 'Alho assado', 'Azeite DOP Trás-os-Montes', 'Colorau fumado', 'Salsa'],
          origem: 'Lota de Matosinhos, comprado às terças e sextas.', tempo: '25 minutos na brasa', serve: 'Uma pessoa com fome, ou duas a partilhar', par: 'alvarinho-moncao' },
        { slug: 'costeleta-maronesa', nome: 'Costeleta de maronesa', desc: 'Maturada 40 dias, cerca de 1 kg, para dois. Sal grosso e mais nada.', preco: 68, tags: ['da brasa', 'para partilhar'], destaque: true,
          longo: 'Raça maronesa, das serras do Alvão e Marão. Maturada a seco durante quarenta dias, grelhada sobre brasa baixa e fatiada à mesa. Pedimos que nos deixe decidir o ponto.',
          ingredientes: ['Costeleta de maronesa DOP', 'Sal grosso de Aveiro', 'Pimenta preta', 'Batata a murro', 'Grelos salteados'],
          origem: 'Criador em Vila Pouca de Aguiar, com quem trabalhamos desde a abertura.', tempo: '40 minutos, com descanso', serve: 'Duas pessoas', par: 'tinto-douro' },
        { slug: 'secretos-porco-preto', nome: 'Secretos de porco preto', desc: 'Migas de espargos bravos, laranja amarga.', preco: 19, tags: ['da brasa'] },
        { slug: 'frango-do-campo', nome: 'Meio frango do campo', desc: 'Aberto, marinado de véspera, piri-piri da casa.', preco: 16, tags: ['da brasa'] },
        { slug: 'couve-coracao', nome: 'Couve coração-de-boi tostada', desc: 'Avelã, queijo da Ilha curado, manteiga noisette.', preco: 13, tags: ['vegetariano', 'da brasa'], destaque: true,
          longo: 'Cortada em quartos e deixada na grelha até as folhas de fora queimarem e as de dentro ficarem doces. O prato vegetariano que os carnívoros pedem segunda vez.',
          ingredientes: ['Couve coração-de-boi', 'Avelã torrada', 'Queijo da Ilha 12 meses', 'Manteiga noisette', 'Limão'],
          origem: 'Horta da Dona Graça, em Gondomar.', tempo: '18 minutos na brasa', serve: 'Uma pessoa, ou acompanhamento para duas', par: 'alvarinho-moncao' }
      ] },
    { id: 'mar', num: 'III', nome: 'Do mar', intro: 'O que a lota trouxe de manhã. Pergunte à sala — muda com o dia.', img: 'Peixe inteiro sobre gelo e folhas de louro, balcão de pedra, luz de janela',
      itens: [
        { slug: 'peixe-do-dia', nome: 'Peixe do dia, inteiro', desc: 'Grelhado com escamas, molho de limão e salsa.', preco: '52 / kg', tags: ['da brasa'] },
        { slug: 'arroz-carabineiro', nome: 'Arroz de carabineiro', desc: 'Malandrinho, coentros, lima. Mínimo duas pessoas.', preco: 29, tags: ['para partilhar'], destaque: true,
          longo: 'Arroz carolino do Mondego cozido no caldo das cabeças, servido em tacho de barro ainda a borbulhar. Come-se de colher, sem pressa.',
          ingredientes: ['Carabineiro', 'Arroz carolino', 'Tomate', 'Coentros', 'Lima', 'Piri-piri'],
          origem: 'Carabineiro da costa algarvia; arroz do Baixo Mondego.', tempo: '30 minutos', serve: 'Por pessoa, mínimo duas', par: 'alvarinho-moncao' },
        { slug: 'lulas-grelhadas', nome: 'Lulas grelhadas', desc: 'Tinta, limão queimado, pão frito.', preco: 18, tags: ['da brasa'] }
      ] },
    { id: 'horta', num: 'IV', nome: 'Da horta', intro: 'Para pôr ao centro e partilhar.', img: null,
      itens: [
        { slug: 'batata-a-murro', nome: 'Batata a murro', desc: 'Alho, louro, azeite.', preco: 5, tags: ['vegan'] },
        { slug: 'tomate-coracao', nome: 'Tomate coração', desc: 'Cebola roxa, oregãos, azeite novo.', preco: 7, tags: ['vegan'] },
        { slug: 'grelos-salteados', nome: 'Grelos salteados', desc: 'Alho laminado, malagueta.', preco: 5.5, tags: ['vegan'] }
      ] },
    { id: 'ficar', num: 'V', nome: 'Para ficar', intro: 'Sobremesas para quem ainda não quer ir embora.', img: 'Pudim cortado num prato de cerâmica irregular, colher pousada, copo de Porto meio',
      itens: [
        { slug: 'pudim-abade-priscos', nome: 'Pudim Abade de Priscos', desc: 'Toucinho, gemas, vinho do Porto. Receita de Braga.', preco: 6.5, tags: ['da casa'], destaque: true,
          longo: 'A receita do Abade de Priscos, feita como manda: toucinho, gemas, açúcar em ponto e um fio de Porto. Denso, brilhante, pequeno de propósito.',
          ingredientes: ['Gemas', 'Açúcar', 'Toucinho', 'Vinho do Porto', 'Casca de limão', 'Canela em pau'],
          origem: 'Receita do século XIX, Braga.', tempo: 'Feito de manhã', serve: 'Uma pessoa, duas colheres', par: 'porto-tawny' },
        { slug: 'pera-bebeda', nome: 'Pera bêbeda', desc: 'Cozida em tinto do Douro, natas batidas, canela.', preco: 6, tags: ['vegetariano'] },
        { slug: 'queijo-serra', nome: 'Queijo Serra da Estrela', desc: 'Amanteigado, compota de abóbora, tostas.', preco: 9, tags: ['para partilhar'] }
      ] },
    { id: 'copos', num: 'VI', nome: 'Copos', intro: 'A garrafeira tem mais de cem referências. Estes servimos a copo.', img: null,
      itens: [
        { slug: 'alvarinho-moncao', nome: 'Alvarinho', desc: 'Monção e Melgaço. Mineral, cítrico, frio.', preco: 6, tags: ['branco'] },
        { slug: 'tinto-douro', nome: 'Tinto do Douro', desc: 'Vale do Tua. Touriga, especiaria, fruta escura.', preco: 7, tags: ['tinto'] },
        { slug: 'porto-tawny', nome: 'Porto Tawny 10 anos', desc: 'Noz, figo seco, casca de laranja.', preco: 6.5, tags: ['generoso'] },
        { slug: 'vermute-casa', nome: 'Vermute da casa', desc: 'Com laranja e gelo grande.', preco: 7, tags: [] }
      ] }
  ]
};
window.PATIO.preco = function (p) { return typeof p === 'number' ? p.toFixed(p % 1 ? 2 : 0).replace('.', ',') + ' €' : p + ' €'; };
window.PATIO.find = function (slug) {
  for (const c of window.PATIO.carta) for (const it of c.itens) if (it.slug === slug) return { item: it, cat: c };
  return null;
};
