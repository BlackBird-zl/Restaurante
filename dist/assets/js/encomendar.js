/* Encomendar · lê e escreve a mesma encomenda persistente usada na carta */
(function(){
  const {D, $, eur, Cart, ALL, toMin, fmt, lisbonNow} = window.Miolo;
  let slot = null, done = false;

  function render(){
    const c = Cart.get(), lines = $('#lines'); lines.innerHTML = '';
    if (!c.length){
      lines.innerHTML = `<li class="empty"><p>Ainda não há nada no pedido.</p><div class="quick">${['classico','batata','limonada'].map(id => `<button type="button" data-add="${id}">+ ${ALL[id].n} · ${eur(ALL[id].p)}</button>`).join('')}</div></li>`;
    }
    c.forEach((l, idx) => {
      const it = ALL[l.id], li = document.createElement('li'); li.className = 'line';
      li.innerHTML = `<strong>${it.n}</strong><span class="qty" role="group" aria-label="Quantidade de ${it.n}"><button type="button" aria-label="Menos um ${it.n}">−</button><span>${l.q}</span><button type="button" aria-label="Mais um ${it.n}">+</button></span><span class="sum">${eur(it.p*l.q)}</span><button type="button" class="rm" aria-label="Remover ${it.n}">Remover</button>`;
      if (it.point){
        const pts = document.createElement('div'); pts.className = 'points'; pts.setAttribute('role','group'); pts.setAttribute('aria-label','Ponto da carne, ' + it.n);
        D.pontos.forEach(p => { const b = document.createElement('button'); b.type = 'button'; b.textContent = p; b.setAttribute('aria-pressed', String(p === l.point)); b.addEventListener('click', () => Cart.setPoint(idx, p)); pts.appendChild(b); });
        li.appendChild(pts);
      }
      const [mi, pl] = li.querySelectorAll('.qty button');
      mi.addEventListener('click', () => Cart.setQty(idx, l.q - 1));
      pl.addEventListener('click', () => Cart.setQty(idx, l.q + 1));
      li.querySelector('.rm').addEventListener('click', () => Cart.setQty(idx, 0));
      lines.appendChild(li);
    });
    const t = Cart.totals();
    $('#tRows').innerHTML = c.length ? c.map(l => `<li><span>${l.q} × ${ALL[l.id].n}${l.point ? ` <span class="pt">${l.point.toLowerCase()}</span>` : ''}</span><span>${eur(ALL[l.id].p*l.q)}</span></li>`).join('') : '<li><span>—</span></li>';
    $('#tSub').textContent = eur(t.sub); $('#tPack').textContent = eur(t.pack); $('#tTot').textContent = eur(t.tot);
    if (t.n) $('#e-cart').hidden = true;
  }
  document.addEventListener('miolo:cart', () => { if (done) showDone(false); render(); });
  render();

  const name = $('#f-name'), phone = $('#f-phone');
  name.addEventListener('input', () => { $('#tName').textContent = name.value.trim() || '—'; });

  // horas de recolha a partir do horário semanal (não indica se a casa está aberta agora)
  (function(){
    const now = lisbonNow(), H = D.horario;
    const slotsFor = (day, from) => { const out = []; H[day].t.forEach(([a,b]) => { let s = Math.max(toMin(a)+20, Math.ceil((from+20)/15)*15); for (; s <= toMin(b)-15; s += 15) out.push(s); }); return out; };
    let label = 'Hoje', list = slotsFor(now.day, now.min);
    if (!list.length){ for (let k=1;k<=7;k++){ const d=(now.day+k)%7, s=slotsFor(d,0); if (s.length){ list=s; label = k===1 ? 'Amanhã' : H[d].d; break; } }
      $('#slotHint').textContent = 'Primeiras horas disponíveis: ' + label.toLowerCase() + '. Contamos cerca de 20 minutos por encomenda.'; }
    const wrap = $('#slots');
    list.slice(0,8).forEach((m,i) => {
      const b = document.createElement('button'); b.type = 'button'; b.textContent = fmt(m); b.setAttribute('aria-pressed', String(i===0)); b.setAttribute('aria-label', label + ', ' + fmt(m));
      b.addEventListener('click', () => { [...wrap.children].forEach(x => x.setAttribute('aria-pressed','false')); b.setAttribute('aria-pressed','true'); slot = label + ', ' + fmt(m); $('#tSlot').textContent = slot; });
      wrap.appendChild(b); if (i===0) slot = label + ', ' + fmt(m);
    });
    $('#tSlot').textContent = slot || '—';
  })();

  function showDone(v){ done = v; $('#t-body').hidden = v; $('#t-done').hidden = !v; if (v) $('#doneBox').focus(); }
  $('#orderForm').addEventListener('submit', e => {
    e.preventDefault();
    const dg = phone.value.replace(/\D/g,'').replace(/^351/,'');
    const okN = name.value.trim().length > 0, okP = /^[29]\d{8}$/.test(dg), okC = Cart.totals().n > 0;
    $('#e-name').hidden = okN; name.setAttribute('aria-invalid', String(!okN));
    $('#e-phone').hidden = okP; phone.setAttribute('aria-invalid', String(!okP));
    $('#e-cart').hidden = okC;
    if (!okC){ $('#lines').scrollIntoView({block:'center'}); return; }
    if (!okN){ name.focus(); return; } if (!okP){ phone.focus(); return; }
    $('#dCode').textContent = 'M-' + String(Math.floor(100 + Math.random()*900));
    $('#dWhen').textContent = 'RECOLHA · ' + (slot || '').toUpperCase();
    $('#dMsg').textContent = name.value.trim() + ', o seu pedido de ' + $('#tTot').textContent + ' fica à sua espera ao balcão.';
    done = false; Cart.clear(); showDone(true);
  });
  $('#again').addEventListener('click', () => { showDone(false); render(); });
})();
