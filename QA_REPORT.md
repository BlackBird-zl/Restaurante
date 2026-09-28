# QA_REPORT — Pátio do Ferro V3 final

**Result: 15/15 checks passed.**

| Check | Result | Evidence |
|---|---|---|
| 17 media assets present | ✅ | `missing=none` |
| All media 4:3 1200×900 | ✅ | `17 files` |
| Manifest has no src:null | ✅ | `patio-media.js` |
| All 17 IDs in manifest | ✅ | `patio-media.js` |
| Reservas.dc.html local media references | ✅ | `./assets/media/T01.webp` |
| Carta.dc.html local media references | ✅ | `./assets/media/T03.webp` |
| Sobre.dc.html local media references | ✅ | `./assets/media/G01.webp, ./assets/media/M01.webp` |
| Contactos.dc.html local media references | ✅ | `./assets/media/E01.webp` |
| Ambiente.dc.html local media references | ✅ | `./assets/media/G01.webp` |
| Produto binds manifest media src | ✅ | `Produto.dc.html` |
| Home uses manifest image src | ✅ | `Home.dc.html` |
| Ambiente uses manifest image src | ✅ | `Ambiente.dc.html` |
| V3 root free of Caprasimo/Organic references | ✅ | `found=none` |
| Reduced motion rule present on public pages | ✅ | `Carta.dc.html, Ambiente.dc.html, Contactos.dc.html, Reservas.dc.html, Produto.dc.html, Sobre.dc.html, Home.dc.html` |
| Reservation is honest demo | ✅ | `Reservas.dc.html` |

## Browser validation
A local HTTP server returned HTTP 200 for all 7 public pages and all 17 media assets (24/24 paths). Headless Chromium in this container did not terminate cleanly because the Claude Design runtime dynamically loads React/Babel from unpkg; therefore this report does not claim a completed browser screenshot pass.

## Scope
- Media integration, file presence, 4:3 dimensions, manifest wiring, V3 visual-system isolation and reduced-motion markers were verified.
- Reservation remains deliberately non-transactional and is labeled as a demonstration.
- Optional Ambiente audio remains omitted because the specification says not to simulate a recording that does not exist.