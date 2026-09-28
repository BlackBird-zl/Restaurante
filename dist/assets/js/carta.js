/* Carta · lista editorial com controlo de quantidade ligado à encomenda persistente */
(function(){
  const {D, $, eur, PLUS, Cart, addWithFeedback, ALL} = window.Miolo;
  const SLUG = {hamb:'hamburgueres', acomp:'acompanhamentos', molhos:'molhos', bebidas:'bebidas', sobremesas:'sobremesas'};
  const tagsHtml = t => t.length ? `<div class="tags">${t.map(x => `<span class="tag ${x}">${D.tags[x]}</span>`).join('')}</div>` : '';

  // categorias
  const cats = $('#cats');
  D.carta.forEach(c => { const li = document.createElement('li'); li.innerHTML = `<a href="#${SLUG[c.id]}">${c.n} <span class="mono">${c.itens.length}</span></a>`; cats.appendChild(li); });

  // hambúrgueres (o Clássico está em destaque)
  D.carta[0].itens.slice(1).forEach(b => {
    const li = document.createElement('li'); li.className = 'burger';
    li.innerHTML = `<span class="no">N.º ${b.no}</span><div><h3>${b.n}</h3><p>${b.d}</p>${tagsHtml(b.tags)}</div><span class="pr">${eur(b.p)}</span><span class="ctl" data-ctl="${b.id}"></span>`;
    $('#burgers').appendChild(li);
  });

  // restantes categorias
  const rest = $('#rest'), grid = document.createElement('div'); grid.className = 'extras';
  D.carta.slice(1).forEach(c => {
    const sec = document.createElement('section'); sec.id = SLUG[c.id]; sec.setAttribute('aria-labelledby', 'h-' + c.id);
    sec.innerHTML = `<div class="cat-h"><h2 id="h-${c.id}">${c.n}</h2></div><ul style="list-style:none;margin:0;padding:0"></ul>`;
    c.itens.forEach(i => {
      const li = document.createElement('li'); li.className = 'ex';
      li.innerHTML = `<div><div class="nm">${i.n}</div><p>${i.d}${i.tags.includes('hot') ? ' · picante' : ''}${i.tags.includes('veg') ? ' · vegetariano' : ''}</p></div><span class="pr">${eur(i.p)}</span><span class="ctl" data-ctl="${i.id}"></span>`;
      sec.querySelector('ul').appendChild(li);
    });
    grid.appendChild(sec);
  });
  rest.appendChild(grid);

  // controlos: "+" quando não está na encomenda, [− n +] quando já está
  function paint(){
    document.querySelectorAll('[data-ctl]').forEach(el => {
      const id = el.dataset.ctl, n = Cart.qtyOf(id), it = ALL[id], big = el.dataset.big;
      const key = n + '|' + id; if (el.dataset.k === key) return; el.dataset.k = key;
      if (!n){
        el.innerHTML = big ? `<button type="button" class="btn btn-ink" data-add="${id}">Adicionar à encomenda ${PLUS.replace('<svg','<svg style="width:18px;height:18px"')}</button>`
                           : `<button type="button" class="plus${it.burger ? '' : ' mini'}" data-add="${id}" aria-label="Adicionar ${it.n} à encomenda">${PLUS}</button>`;
      } else {
        el.innerHTML = `<span class="qty" role="group" aria-label="${it.n}: quantidade na encomenda"><button type="button" data-less="${id}" aria-label="Menos um ${it.n}">−</button><span aria-live="polite">${n}</span><button type="button" data-add="${id}" aria-label="Mais um ${it.n}">+</button></span>`;
      }
    });
  }
  document.addEventListener('click', e => { const b = e.target.closest('[data-less]'); if (b){ Cart.removeOne(b.dataset.less); } });
  document.addEventListener('miolo:cart', paint);
  paint();

  // categoria activa enquanto se percorre a carta
  const links = [...cats.querySelectorAll('a')];
  if ('IntersectionObserver' in window){
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting){ links.forEach(a => a.setAttribute('aria-current', String(a.getAttribute('href') === '#' + e.target.id))); } }), {rootMargin:'-30% 0px -60% 0px'});
    Object.values(SLUG).forEach(s => { const el = document.getElementById(s); if (el) io.observe(el); });
  }
})();
