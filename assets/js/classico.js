/* O Clássico · anatomia com lupa, régua de distância */
(function(){
  const {D, $, reduce, ROOT} = window.Miolo;
  const L = D.camadas;
  const spec = $('#spec'), ol = $('#layers'), slices = [];
  const lupaSrc = l => ROOT + 'assets/img/lupa-' + l.z + '-' + (l.z==='tomate'?700:800) + '.webp';

  L.forEach((l,i) => {
    const s = document.createElement('div'); s.className = 'slice';
    const h = l.b - l.a; s.style.height = h + '%';
    s.style.setProperty('--src', 'url(' + ROOT + 'assets/img/sc-estudio-1254.webp)');
    s.style.backgroundPosition = '0 ' + (h >= 100 ? 0 : (l.a/(100-h))*100) + '%';
    spec.appendChild(s); slices.push(s);
    const li = document.createElement('li'); li.style.setProperty('--c', l.c);
    li.innerHTML = `<button type="button" aria-pressed="false"><span class="sw" aria-hidden="true"></span><span class="ix">${String(i+1).padStart(2,'0')}</span><h3>${l.n}</h3><span class="g">${l.g}</span><p>${l.d}</p></button>`;
    const b = li.firstChild;
    b.addEventListener('mouseenter', () => { if (matchMedia('(hover:hover)').matches) activate(i); });
    b.addEventListener('focus', () => activate(i));
    b.addEventListener('click', () => activate(i));
    b.addEventListener('keydown', e => {
      if (e.key==='ArrowDown'||e.key==='ArrowRight'){ e.preventDefault(); go(i+1); }
      if (e.key==='ArrowUp'||e.key==='ArrowLeft'){ e.preventDefault(); go(i-1); }
    });
    ol.appendChild(li);
  });
  function go(j){ j = (j+L.length)%L.length; ol.children[j].firstChild.focus(); activate(j); }

  let active = 0, exploded = false;
  const lupaImg = $('#lupaImg'), lupaLab = $('#lupaLab');
  function lupa(i){
    const l = L[i], src = lupaSrc(l); if (lupaImg.getAttribute('src') === src) return;
    const im = new Image(); im.src = src;
    const show = () => { if (active !== i) return; lupaImg.src = src; lupaImg.alt = l.za; lupaLab.textContent = l.n + ' · ao perto';
      lupaImg.classList.remove('in'); void lupaImg.offsetWidth; if (!reduce) lupaImg.classList.add('in'); };
    (im.decode ? im.decode() : Promise.resolve()).then(show, show);
  }
  function layout(){
    const g = Math.max(8, spec.clientWidth*0.022);
    slices.forEach((s,j) => {
      let y = 0;
      if (exploded) y = (j-3)*g; else if (active >= 0) y = j < active ? -g : j > active ? g : 0;
      s.style.transform = 'translateY(' + y + 'px)'; s.classList.toggle('on', j === active);
    });
    spec.classList.toggle('active', active >= 0);
    [...ol.children].forEach((li,j) => { li.classList.toggle('on', j===active); li.firstChild.setAttribute('aria-pressed', String(j===active)); });
    $('#stepTxt').textContent = String(active+1).padStart(2,'0') + ' / 07';
  }
  function activate(i){ active = i; layout(); lupa(i); }
  $('#prevL').addEventListener('click', () => activate((active-1+L.length)%L.length));
  $('#nextL').addEventListener('click', () => activate((active+1)%L.length));
  $('#explode').addEventListener('click', e => { exploded = !exploded; e.currentTarget.setAttribute('aria-pressed', String(exploded)); e.currentTarget.textContent = exploded ? 'Montar' : 'Separar camadas'; layout(); });
  addEventListener('resize', layout);
  activate(0);
  // pré-carrega os grandes planos quando a secção se aproxima
  if ('IntersectionObserver' in window){
    const io = new IntersectionObserver(es => { if (es[0].isIntersecting){ L.forEach(l => { const x = new Image(); x.src = lupaSrc(l); }); io.disconnect(); } }, {rootMargin:'400px'});
    io.observe(spec);
  }

  /* régua de distância */
  const rail = $('#rail'), links = [...rail.querySelectorAll('a')];
  const secs = links.map(a => document.querySelector(a.getAttribute('href')));
  if ('IntersectionObserver' in window){
    const io2 = new IntersectionObserver(es => {
      es.forEach(e => { if (e.isIntersecting){ const id = e.target.id;
        links.forEach(a => a.setAttribute('aria-current', String(a.getAttribute('href') === '#'+id)));
        const cur = links.find(a => a.getAttribute('href') === '#'+id); if (cur) rail.scrollTo({left: cur.parentElement.offsetLeft - rail.clientWidth/2 + cur.offsetWidth/2}); } });
    }, {rootMargin:'-45% 0px -45% 0px'});
    secs.forEach(s => s && io2.observe(s));
  }
  const whole = $('#inteiro');
  const showRail = () => rail.classList.toggle('show', scrollY > whole.offsetHeight * 0.6);
  addEventListener('scroll', showRail, {passive:true}); showRail();
})();
