# Pátio do Ferro — V3 final

## Conceito
**A mesma mesa, a noite inteira.**  
A interface mantém-se estável enquanto a mesa, a luz e os vestígios do serviço mudam.

## Abrir
O pacote é autocontido para o protótipo público. Sirva a pasta por HTTP (não abra diretamente por `file://`, porque os componentes carregam ficheiros relativos).

Exemplo:

```bash
python -m http.server 8080
```

Depois abra:

- `Home.dc.html`
- `Carta.dc.html`
- `Produto.dc.html?p=polvo-na-brasa`
- `Ambiente.dc.html`
- `Reservas.dc.html`
- `Sobre.dc.html`
- `Contactos.dc.html`

## Media
Os 17 assets finais estão em `assets/media/`:

- T01–T05 — sequência da mesma mesa;
- S01–S03 — mesma sala em três momentos;
- P01–P05 — cinco produtos;
- B01 — bebida;
- G01 — serviço;
- M01 — detalhe da junta;
- E01 — limiar/ambiente.

Todos são WebP 4:3 locais. `patio-media.js` é a fonte de verdade dos caminhos e alt text.

## Regras visuais aplicadas
- imagens retangulares, sem máscaras orgânicas;
- canvas mineral `#F1F2EE`;
- tinta `#252B29`;
- brasa apenas como sinal `#A13827`;
- régua/junta a 62,5%;
- nenhuma imagem depende de texto embutido;
- sem autoplay, parallax, WebGL ou animação narrativa;
- Carta e Reservas permanecem acessíveis sem atravessar a sequência da Home;
- `prefers-reduced-motion` é respeitado.

## Limites intencionais
- restaurante, contactos e morada são fictícios;
- reserva é demonstração e não envia dados;
- áudio opcional de Ambiente não foi incluído porque a especificação proíbe simular uma gravação real;
- a V2 permanece arquivada em `v2/`.

## Origem de direção
A implementação segue `uploads/PATIO_DO_FERRO_DIRECAO_CRIATIVA_V3_Claude.md` e a Biblioteca Visual V2.1 usada como metodologia de fotografia: BASE + CENA/LUZ + CÂMARA + ACABAMENTO + SAÍDA/RESTRIÇÕES.
