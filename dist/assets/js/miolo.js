/* Miolo · comportamento partilhado: cabeçalho, menu móvel, carrinho persistente, avisos. */
(function(){
  const ROOT = (document.currentScript && document.currentScript.src || '').replace(/assets\/js\/miolo\.js.*$/, '');
  const D = window.MIOLO_DATA;
  const $ = (s, r=document) => r.querySelector(s);
  const eur = n => n.toFixed(2).replace('.', ',') + ' €';
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const ALL = {}; D.carta.forEach(c => c.itens.forEach(i => { ALL[i.id] = i; }));
  const PLUS = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>';
  const ARROW = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M4 12h15M13 6l6 6-6 6"/></svg>';

  /* ---------- carrinho: persiste em localStorage, com memória como recurso ---------- */
  const KEY = 'miolo-encomenda-v1';
  let mem = [];
  function read(){
    try { const v = JSON.parse(localStorage.getItem(KEY) || '[]'); if (Array.isArray(v)) return v.filter(l => ALL[l.id] && l.q > 0); } catch(e){}
    return mem.slice();
  }
  function write(c){ mem = c.slice(); try { localStorage.setItem(KEY, JSON.stringify(c)); } catch(e){} emit(); }
  function emit(){ document.dispatchEvent(new CustomEvent('miolo:cart', {detail: Cart.totals()})); }
  const Cart = {
    get: read,
    add(id, point){
      const it = ALL[id]; if (!it) return;
      const c = read(), p = it.point ? (point || 'Ao ponto') : undefined;
      const ex = c.find(l => l.id === id && l.point === p);
      if (ex) ex.q++; else c.push({id, q:1, point:p});
      write(c);
    },
    removeOne(id){
      const c = read(); for (let i=c.length-1;i>=0;i--){ if (c[i].id===id){ c[i].q--; if (c[i].q<=0) c.splice(i,1); break; } } write(c);
    },
    setQty(i, q){ const c = read(); if (!c[i]) return; c[i].q = q; if (q <= 0) c.splice(i,1); write(c); },
    setPoint(i, p){ const c = read(); if (!c[i]) return; c[i].point = p;
      // junta linhas iguais
      const j = c.findIndex((l,k) => k!==i && l.id===c[i].id && l.point===p); if (j>=0){ c[j].q += c[i].q; c.splice(i,1); } write(c); },
    clear(){ write([]); },
    qtyOf(id){ return read().filter(l => l.id===id).reduce((a,l)=>a+l.q,0); },
    totals(){
      const c = read(), n = c.reduce((a,l)=>a+l.q,0), sub = c.reduce((a,l)=>a+ALL[l.id].p*l.q,0);
      const pack = c.reduce((a,l)=>a+(ALL[l.id].burger?l.q:0),0) * D.embalagem;
      return {n, sub, pack, tot: sub+pack};
    }
  };
  addEventListener('storage', e => { if (e.key === KEY) emit(); });

  /* ---------- cabeçalho ---------- */
  const hdr = $('#hdr');
  const onScroll = () => hdr && hdr.classList.toggle('solid', scrollY > 30 || document.body.dataset.head === 'solid');
  addEventListener('scroll', onScroll, {passive:true}); onScroll();

  function paintCount(bump){
    const t = Cart.totals();
    document.querySelectorAll('[data-cart-n]').forEach(el => { el.textContent = t.n; el.dataset.zero = String(t.n===0); });
    document.querySelectorAll('[data-cart-t]').forEach(el => { el.textContent = t.n ? eur(t.tot) : ''; });
    const mb = $('#mbar');
    if (mb){ $('#mbT').textContent = eur(t.tot); $('#mbN').textContent = t.n + (t.n===1?' artigo':' artigos'); updBar(); }
    if (bump && !reduce) document.querySelectorAll('.orderpill').forEach(p => { p.classList.remove('bump'); void p.offsetWidth; p.classList.add('bump'); });
  }
  function updBar(){ const mb=$('#mbar'); if (!mb) return; mb.classList.toggle('show', Cart.totals().n > 0 && scrollY > 240); }
  addEventListener('scroll', updBar, {passive:true});
  document.addEventListener('miolo:cart', () => paintCount(true));
  paintCount(false);

  /* ---------- menu móvel ---------- */
  const menu = $('#menu'), mbtn = $('#menuBtn');
  function openMenu(v){
    if (!menu) return;
    menu.classList.toggle('open', v); menu.setAttribute('aria-hidden', String(!v)); menu.inert = !v;
    mbtn.setAttribute('aria-expanded', String(v)); document.body.classList.toggle('lock', v);
    if (v) setTimeout(() => $('.menu-close', menu).focus(), 30); else mbtn.focus();
  }
  if (menu){
    menu.inert = true;
    mbtn.addEventListener('click', () => openMenu(true));
    $('.menu-close', menu).addEventListener('click', () => openMenu(false));
    menu.addEventListener('keydown', e => {
      if (e.key === 'Escape') openMenu(false);
      if (e.key === 'Tab'){ const f=[...menu.querySelectorAll('a,button')]; const a=f[0], z=f[f.length-1];
        if (e.shiftKey && document.activeElement===a){ e.preventDefault(); z.focus(); } else if (!e.shiftKey && document.activeElement===z){ e.preventDefault(); a.focus(); } }
    });
    menu.querySelectorAll('a').forEach(a => a.addEventListener('click', () => { document.body.classList.remove('lock'); }));
  }

  /* ---------- aviso com desfazer ---------- */
  let tt, lastAdd = null;
  function toast(msg, opts={}){
    const t = $('#toast'); if (!t) return;
    $('#toastTxt').textContent = msg;
    $('#toastUndo').hidden = !opts.undo; $('#toastGo').hidden = !!opts.hideGo;
    t.classList.add('show'); clearTimeout(tt); tt = setTimeout(() => t.classList.remove('show'), 4200);
  }
  const undoBtn = $('#toastUndo');
  if (undoBtn) undoBtn.addEventListener('click', () => { if (lastAdd){ Cart.removeOne(lastAdd); lastAdd=null; } $('#toast').classList.remove('show'); });
  function addWithFeedback(id, btn){
    Cart.add(id); lastAdd = id;
    toast(ALL[id].n + ' adicionado', {undo:true, hideGo: document.body.dataset.page==='encomendar'});
    if (btn){ btn.classList.add('ok'); setTimeout(() => btn.classList.remove('ok'), 900); }
  }
  // qualquer elemento com data-add="id" adiciona à encomenda
  document.addEventListener('click', e => { const b = e.target.closest('[data-add]'); if (b){ e.preventDefault(); addWithFeedback(b.dataset.add, b); } });

  /* ---------- copiar ---------- */
  document.querySelectorAll('[data-copy]').forEach(b => b.addEventListener('click', () => {
    const v=b.dataset.copy, o=b.textContent, done=ok=>{ b.textContent=ok?'Copiado':'Selecione o texto acima'; setTimeout(()=>b.textContent=o,1600); };
    try{ navigator.clipboard.writeText(v).then(()=>done(true),()=>done(false)); }catch(e){ done(false); }
  }));

  /* ---------- horário: formatação partilhada ---------- */
  const toMin = s => { const [h,m] = s.split(':').map(Number); return h*60+m; };
  const fmt = m => { m %= 1440; return String(Math.floor(m/60)).padStart(2,'0') + 'h' + String(m%60).padStart(2,'0'); };
  function lisbonNow(){
    try{
      const p = new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Lisbon',weekday:'short',hour:'2-digit',minute:'2-digit',hour12:false}).formatToParts(new Date());
      const g = t => (p.find(x=>x.type===t)||{}).value;
      return {day:['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].indexOf(g('weekday')), min:(Number(g('hour'))%24)*60+Number(g('minute'))};
    }catch(e){ const d=new Date(); return {day:d.getDay(), min:d.getHours()*60+d.getMinutes()}; }
  }

  window.Miolo = { ROOT, D, $, eur, reduce, ALL, PLUS, ARROW, Cart, toast, addWithFeedback, toMin, fmt, lisbonNow };
})();
