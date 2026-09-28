/* Miolo · dados partilhados por todas as páginas (fonte única).
   Casa fictícia de demonstração. */
window.MIOLO_DATA = {
  horario: [
    {d:'Domingo', t:[['12:00','16:00']]},
    {d:'Segunda', t:[]},
    {d:'Terça',   t:[['12:00','15:00'],['19:00','23:00']]},
    {d:'Quarta',  t:[['12:00','15:00'],['19:00','23:00']]},
    {d:'Quinta',  t:[['12:00','15:00'],['19:00','23:00']]},
    {d:'Sexta',   t:[['12:00','15:00'],['19:00','24:00']]},
    {d:'Sábado',  t:[['12:00','15:00'],['19:00','24:00']]}
  ],
  casa: { morada:'Rua de Demonstração, 00', cp:'1000-000 Lisboa', telefone:'+351 210 000 000', email:'ola@miolo.example' },
  embalagem: 0.5, // por hambúrguer
  pontos: ['Mal passado','Ao ponto','Bem passado'],
  carta: [
    {id:'hamb', n:'Hambúrgueres', intro:'Novilho nacional, brioche da casa. Os de carne saem ao ponto, salvo pedido.', itens:[
      {id:'classico', no:'01', n:'O Clássico', d:'150 g de novilho, cheddar, alface frisada, tomate, maionese da casa, brioche com sésamo.', p:9.5, tags:['star'], point:true, burger:true},
      {id:'duplo', no:'02', n:'Duplo', d:'Duas carnes de 110 g, duas fatias de cheddar, pickles, cebola picada, molho Miolo.', p:12.5, tags:[], point:true, burger:true},
      {id:'bacon', no:'03', n:'Bacon e cebola', d:'150 g de novilho, bacon fumado, cebola caramelizada em cerveja preta, cheddar.', p:11.5, tags:[], point:true, burger:true},
      {id:'picante', no:'04', n:'Picante', d:'150 g de novilho, pepper jack, jalapeños grelhados, maionese de chipotle.', p:11, tags:['hot'], point:true, burger:true},
      {id:'cogumelo', no:'05', n:'Cogumelo', d:'Portobello grelhado, queijo de cabra, rúcula, cebola roxa, maionese de alho assado.', p:10.5, tags:['veg'], burger:true},
      {id:'frango', no:'06', n:'Frango crocante', d:'Coxa desossada em leitelho, panada, couve roxa, pickles, mel picante.', p:10.5, tags:[], burger:true}
    ]},
    {id:'acomp', n:'Acompanhamentos', itens:[
      {id:'batata', n:'Batata frita', d:'Corte grosso, frita duas vezes.', p:3.5, tags:['veg']},
      {id:'doce', n:'Batata-doce', d:'Palitos finos, páprica fumada.', p:4, tags:['veg']},
      {id:'aneis', n:'Anéis de cebola', d:'Massa de cerveja, 8 unidades.', p:4.5, tags:['veg']},
      {id:'salada', n:'Salada da horta', d:'Folhas, pepino, rabanete.', p:4, tags:['veg']}]},
    {id:'molhos', n:'Molhos', itens:[
      {id:'m-miolo', n:'Molho Miolo', d:'Maionese, pickles, mostarda.', p:1, tags:[]},
      {id:'m-chip', n:'Chipotle', d:'Malagueta fumada.', p:1, tags:['hot']},
      {id:'m-alho', n:'Alho assado', d:'Maionese de alho assado.', p:1, tags:['veg']},
      {id:'m-ketchup', n:'Ketchup da casa', d:'Tomate reduzido, cravinho.', p:1, tags:['veg']}]},
    {id:'bebidas', n:'Bebidas', itens:[
      {id:'limonada', n:'Limonada de hortelã', d:'Feita ao momento, 40 cl.', p:3.5, tags:[]},
      {id:'cerveja', n:'Cerveja artesanal', d:'Lager de Lisboa, 33 cl.', p:4, tags:[]},
      {id:'cola', n:'Refrigerante', d:'Cola, laranja ou água com gás.', p:2.5, tags:[]},
      {id:'batido', n:'Batido de baunilha', d:'Gelado e leite gordo, 40 cl.', p:5, tags:[]}]},
    {id:'sobremesas', n:'Sobremesas', itens:[
      {id:'brownie', n:'Brownie', d:'Chocolate 70%, flor de sal.', p:4, tags:['veg']},
      {id:'cookie', n:'Bolacha gigante', d:'Manteiga tostada, chocolate.', p:3, tags:['veg']}]}
  ],
  tags: {star:'O mais pedido', veg:'Vegetariano', hot:'Picante'},
  camadas: [
    {n:'Pão de brioche', g:'70 g', c:'#C8772E', a:0,    b:37.5, z:'pao',      za:'Brioche dourado com sésamo, de muito perto.', d:'Tostado na chapa, com sésamo branco. Massa de 12 horas, cozida às 10h00.'},
    {n:'Maionese da casa', g:'15 g', c:'#E9DDBE', a:37.5, b:40, z:'maionese', za:'Maionese da casa entre o pão e a alface.', d:'Gema, mostarda antiga e limão. Só na tampa, para o pão não amolecer.'},
    {n:'Alface frisada', g:'20 g', c:'#5A8E28', a:40,  b:46.5, z:'alface',   za:'Alface frisada com gotas de água.', d:'Lavada em água gelada e bem escorrida. Faz de barreira entre o molho e o tomate.'},
    {n:'Tomate', g:'2 rodelas', c:'#CF3A22', a:46.5, b:54.5, z:'tomate',     za:'Rodelas de tomate com gotas, sobre o cheddar.', d:'Tomate coração de boi, cortado com 8 mm e temperado com flor de sal.'},
    {n:'Cheddar', g:'20 g', c:'#F2B01E', a:54.5, b:59.5, z:'cheddar',        za:'Cheddar derretido a escorrer pela carne.', d:'Cheddar curado, derretido na última volta com a campânula por cima.'},
    {n:'Carne', g:'150 g', c:'#5A3322', a:59.5, b:72, z:'carne',             za:'Crosta da carne grelhada, com os sucos à superfície.', d:'Acém e peito de novilho, 20% de gordura. Espalmada uma vez, nunca pressionada.'},
    {n:'Pão base', g:'45 g', c:'#C8772E', a:72,  b:100, z:'base',            za:'Pão da base tostado, com a carne por cima.', d:'A metade de baixo, tostada até ganhar crosta para aguentar o suco.'}
  ],
  cenas: [
    {k:'estudio', n:'Estúdio', h:'11h00', bg:'#CBB9AC', ink:'#1E1611', sub:'#5E4E43', acc:'#9B4E17', K:5500,
     luz:'Softbox ampla, frontal', sup:'Fundo neutro controlado', mom:'Prova antes de abrir',
     line:'Antes de abrir a porta, o primeiro Clássico do dia sai para a prova. Luz limpa, cada camada à vista.',
     alt:'O Clássico de frente sobre fundo neutro, com luz de estúdio uniforme.'},
    {k:'janela', n:'Janela', h:'13h15', bg:'#D8CFB6', ink:'#2A1C10', sub:'#6B5A45', acc:'#4F7F24', K:5000,
     luz:'Natural, de janela', sup:'Bancada clara', mom:'Almoço',
     line:'Ao almoço a sala enche de luz natural. Folhas verdes ao fundo e o cheddar ainda a escorrer.',
     alt:'O Clássico numa bancada clara, com luz natural de janela e plantas desfocadas ao fundo.'},
    {k:'balcao', n:'Balcão', h:'19h30', bg:'#5B3A20', ink:'#F6EADB', sub:'#D9BFA2', acc:'#F2B01E', K:3200,
     luz:'Candeeiros da sala', sup:'Balcão de madeira', mom:'Início do serviço',
     line:'Quando o serviço começa, o Clássico pousa no balcão de madeira, debaixo dos candeeiros da sala.',
     alt:'O Clássico no balcão de madeira, com candeeiros suspensos acesos ao fundo.'},
    {k:'noite', n:'Noite', h:'21h40', bg:'#24160A', ink:'#F3E9DC', sub:'#BFA78C', acc:'#F2B01E', K:2700,
     luz:'Pontual, quente', sup:'Tábua escura', mom:'Jantar',
     line:'Ao jantar a luz baixa e aquece. A crosta da carne ganha brilho e a sala fica em bokeh.',
     alt:'O Clássico numa tábua escura, com luz âmbar e bokeh quente ao fundo.'}
  ]
};
