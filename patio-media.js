// Manifesto de media V3 — pacote final local.
// Todos os assets aprovados são servidos do próprio repositório para evitar hotlinks e quebras em deploy.
(function () {
  function m(id, alt, group, brief) {
    return {
      id: id,
      src: './assets/media/' + id + '.webp',
      derivatives: [],
      aspectRatio: '4 / 3',
      alt: alt,
      referenceGroup: group,
      approved: true,
      brief: brief
    };
  }
  window.PATIO_MEDIA = {
    T01: m('T01', 'Mesa preparada para dois: copos de água, guardanapo de linho, pão inteiro.', 'T', 'T01 · Antes — mesa de referência, vista superior 90°, 4:3'),
    T02: m('T02', 'A mesma mesa com o pão partido e sinais do início do serviço.', 'T', 'T02 · Pão — mesma geometria de T01'),
    T03: m('T03', 'A mesma mesa com uma travessa para partilhar ao centro.', 'T', 'T03 · Centro — travessa ao centro'),
    T04: m('T04', 'A mesma mesa depois da travessa, com a sobremesa e os copos.', 'T', 'T04 · Ficar — sobremesa e copos'),
    T05: m('T05', 'A mesma mesa depois da recolha, com sinais discretos da noite.', 'T', 'T05 · Depois — recolha, marca de água'),
    S01: m('S01', 'A sala às 19h00, ainda com luz exterior.', 'S', 'S01 · Sala 19h00 — mesmo ponto de vista'),
    S02: m('S02', 'A mesma sala às 21h00, já com luz de serviço.', 'S', 'S02 · Sala 21h00 — mesmo ponto de vista'),
    S03: m('S03', 'A mesma sala às 23h50, no fim do serviço.', 'S', 'S03 · Sala 23h50 — mesmo ponto de vista'),
    P01: m('P01', 'Polvo na brasa servido em cerâmica sobre a mesa.', 'P', 'P01 · Polvo — fotografia de produto'),
    P02: m('P02', 'Costeleta fatiada para partilhar.', 'P', 'P02 · Costeleta — porção para dois'),
    P03: m('P03', 'Prato vegetal tostado, servido em cerâmica.', 'P', 'P03 · Couve — tostado irregular'),
    P04: m('P04', 'Prato de marisco servido para partilha.', 'P', 'P04 · Arroz — tacho para dois'),
    P05: m('P05', 'Uma porção de pudim de caramelo.', 'P', 'P05 · Pudim — porção pequena'),
    B01: m('B01', 'Bebida da casa servida com luz quente.', 'B', 'B01 · Vermute — contraluz suave'),
    G01: m('G01', 'A mesa no momento do serviço.', 'G', 'G01 · Serviço — gesto à mesa'),
    M01: m('M01', 'Pormenor da junta de ferro entre as duas peças de madeira da mesa.', 'M', 'M01 · Junta — detalhe material'),
    E01: m('E01', 'Limiar e ambiente da casa ao anoitecer.', 'E', 'E01 · Limiar — anoitecer')
  };
})();
