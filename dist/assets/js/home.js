/* Home · pré-visualizações */
(function(){
  const {D, $, eur, PLUS} = window.Miolo;
  const R = window.Miolo.ROOT;

  /* 01 · a pilha: passar numa camada mostra o seu grande plano */
  const TC = {3:'#FFFFFF', 5:'#F6EADB'};
  const stack = $('#stack'), alt = $('#pvAlt'), lab = $('#pvLab');
  D.camadas.forEach((l,i) => {
    const li = document.createElement('li');
    li.innerHTML = `<button type="button" style="--c:${l.c};${TC[i]?'--tc:'+TC[i]:''}"><span>${l.n}</span><span class="mono">${l.g}</span></button>`;
    const b = li.firstChild;
    const show = () => {
      [...stack.querySelectorAll('button')].forEach(x => x.classList.toggle('on', x===b));
      const src = R + 'assets/img/lupa-' + l.z + '-' + (l.z==='tomate'?700:800) + '.webp';
      const im = new Image(); im.src = src;
      const go = () => { alt.src = src; alt.alt = l.za; alt.classList.add('on'); lab.textContent = l.n + ' · ao perto'; };
      (im.decode ? im.decode() : Promise.resolve()).then(go, go);
    };
    b.addEventListener('mouseenter', show); b.addEventListener('focus', show); b.addEventListener('click', show);
    stack.appendChild(li);
  });
  stack.addEventListener('mouseleave', () => { if (!stack.contains(document.activeElement)){ alt.classList.remove('on'); lab.textContent='Cheddar · ao perto'; stack.querySelectorAll('button').forEach(x=>x.classList.remove('on')); } });

  /* 02 · faixa das atmosferas: o fundo acompanha a luz escolhida */
  const at = $('#pvAt'), links = [...document.querySelectorAll('#strip4 a')];
  links.forEach(a => {
    const on = () => { links.forEach(x => x.classList.toggle('on', x===a)); at.style.setProperty('--bg', a.dataset.bg); };
    a.addEventListener('mouseenter', on); a.addEventListener('focus', on);
  });

  /* 03 · amostra da carta */
  const mm = $('#miniMenu');
  D.carta[0].itens.slice(0,3).forEach(it => {
    const li = document.createElement('li');
    li.innerHTML = `<strong>${it.n}</strong><span class="mono">${eur(it.p)}</span><button type="button" class="plus mini" data-add="${it.id}" aria-label="Adicionar ${it.n} à encomenda">${PLUS}</button>`;
    mm.appendChild(li);
  });
})();
