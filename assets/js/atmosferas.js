/* Atmosferas · quatro luzes sobre o mesmo Clássico, sem recarregar a página */
(function(){
  const {D, $, reduce, ROOT} = window.Miolo;
  const S = D.cenas, atm = $('#atm'), list = $('#scenes');
  const IMG = k => ROOT + 'assets/img/sc-' + k;
  const SRCSET = k => `${IMG(k)}-750.webp 750w, ${IMG(k)}-1254.webp 1254w`;
  const pos = h => { const [a,b] = h.split('h').map(Number); return ((a + b/60) - 10) / 13 * 100; };

  // eixo das horas
  const ticks = $('#ticks');
  [11,13,15,17,19,21,23].forEach(h => { const s = document.createElement('span'); s.style.left = ((h-10)/13*100) + '%'; s.textContent = h + 'h'; ticks.appendChild(s); });

  S.forEach((s,i) => {
    const li = document.createElement('li'); li.style.left = pos(s.h) + '%';
    li.innerHTML = `<button type="button" role="radio" aria-checked="false" tabindex="-1"><img src="${IMG(s.k)}-750.webp" width="750" height="750" alt="" loading="lazy" decoding="async"><span><span class="nm">${s.n}</span><span class="hr">${s.h.toUpperCase()}</span></span></button>`;
    const b = li.firstChild;
    b.setAttribute('aria-label', s.n + ', ' + s.h);
    b.addEventListener('click', () => set(i));
    b.addEventListener('keydown', e => { let j = null;
      if (e.key==='ArrowRight'||e.key==='ArrowDown') j=(i+1)%S.length; if (e.key==='ArrowLeft'||e.key==='ArrowUp') j=(i+S.length-1)%S.length;
      if (j !== null){ e.preventDefault(); set(j); list.children[j].firstChild.focus(); } });
    list.appendChild(li);
  });

  let front = $('#imgA'), back = $('#imgB'), cur = -1, req = 0;
  function ui(i){
    const s = S[i];
    ['bg','ink','sub','acc'].forEach(p => atm.style.setProperty('--st-' + p, s[p]));
    document.body.dataset.head = (s.k === 'balcao' || s.k === 'noite') ? 'dark' : 'light';
    const nm = $('#sceneName'); nm.innerHTML = `<span>${s.n}</span>`;
    $('#sceneHour').textContent = (s.h + ' · ' + s.mom).toUpperCase();
    $('#capTxt').textContent = (s.n + ' · ' + s.h).toUpperCase();
    $('#ficha').innerHTML = `<div><dt>Luz</dt><dd>${s.luz}</dd></div><div><dt>Superfície</dt><dd>${s.sup}</dd></div><div><dt>Temperatura</dt><dd class="mono" style="font-size:14px">${s.K} K</dd></div><div><dt>Momento</dt><dd>${s.mom}</dd></div>`;
    $('#sceneLine').textContent = s.line;
    $('#kMk').style.left = ((s.K - 2700) / (5500 - 2700) * 100) + '%';
    $('#kVal').textContent = s.K + ' K';
    [...list.children].forEach((li,j) => { li.classList.toggle('on', j===i); const b = li.firstChild; b.setAttribute('aria-checked', String(j===i)); b.tabIndex = j===i ? 0 : -1; });
    try { history.replaceState(null, '', '#' + s.k); } catch(e){}
  }
  function set(i, first){
    if (i === cur) return;
    const s = S[i], r = ++req;
    if (first && s.k === 'noite'){ cur = i; ui(i); return; }
    const im = new Image(); im.sizes = front.sizes; im.srcset = SRCSET(s.k); im.src = IMG(s.k) + '-1254.webp';
    const commit = () => { if (r !== req) return; cur = i;
      back.srcset = SRCSET(s.k); back.src = IMG(s.k) + '-1254.webp'; back.alt = s.alt; back.removeAttribute('aria-hidden');
      front.setAttribute('aria-hidden','true'); front.alt = '';
      back.classList.remove('out'); front.classList.add('out'); [front, back] = [back, front];
      ui(i); };
    (im.decode ? im.decode() : Promise.resolve()).then(commit, commit);
  }
  const fromHash = S.findIndex(s => '#' + s.k === location.hash);
  set(fromHash >= 0 ? fromHash : 3, true);
  addEventListener('hashchange', () => { const j = S.findIndex(s => '#' + s.k === location.hash); if (j >= 0) set(j); });
  // pré-carrega as outras luzes depois da primeira pintura
  addEventListener('load', () => S.forEach(s => { const i = new Image(); i.sizes = front.sizes; i.srcset = SRCSET(s.k); }));
  // deslizar sobre a fotografia
  (function(){ let x0 = null; const f = $('#frame');
    f.addEventListener('pointerdown', e => { x0 = e.clientX; });
    f.addEventListener('pointerup', e => { if (x0 === null) return; const dx = e.clientX - x0; x0 = null; if (Math.abs(dx) > 40) set((cur + (dx < 0 ? 1 : S.length-1)) % S.length); });
  })();
})();
