// Sequências V3. Ordem explícita; horas editoriais (noite ilustrativa de sexta/sábado), não relógio real.
window.PATIO_SCENES = {
  home: [
    { id: 'antes', label: 'Antes', editorialTime: '19h00', caption: 'A mesa está pronta. A noite ainda não.', mediaId: 'T01', optionalLink: null },
    { id: 'pao', label: 'Pão', editorialTime: '19h40', caption: 'Parte-se o pão. Começa-se por aqui.', mediaId: 'T02', optionalLink: null },
    { id: 'centro', label: 'Centro', editorialTime: '21h00', caption: 'A travessa fica ao centro. Cada um tira a sua parte.', mediaId: 'T03', optionalLink: { label: 'Ver a costeleta', href: 'Produto.dc.html?p=costeleta-maronesa' } },
    { id: 'ficar', label: 'Ficar', editorialTime: '22h30', caption: 'A sobremesa acaba. A conversa continua.', mediaId: 'T04', optionalLink: { label: 'Ver as sobremesas', href: 'Carta.dc.html#ficar' } },
    { id: 'depois', label: 'Depois', editorialTime: '23h50', caption: 'Saem os pratos. Ficam os sinais da noite.', mediaId: 'T05', optionalLink: null }
  ],
  ambiente: [
    { id: 's19', label: 'Início', editorialTime: '19h00', caption: 'Ainda entra luz pela porta do pátio. As primeiras mesas sentam-se.', mediaId: 'S01', optionalLink: null },
    { id: 's21', label: 'Serviço', editorialTime: '21h00', caption: 'Lá fora escureceu. A sala está cheia.', mediaId: 'S02', optionalLink: null },
    { id: 's2350', label: 'Recolha', editorialTime: '23h50', caption: 'As mesmas luzes, menos mesas. Começa a recolha.', mediaId: 'S03', optionalLink: null }
  ]
};
