/* Home · teaser das Atmosferas: arrastar entre duas luzes (sem avanço automático) */
(function(){
  const split = document.getElementById('split'), range = document.getElementById('splitRange');
  if (!split) return;
  const set = v => { v = Math.max(0, Math.min(100, v)); split.style.setProperty('--x', v + '%'); range.value = Math.round(v); };
  let drag = false;
  const at = e => { const r = split.getBoundingClientRect(); set((e.clientX - r.left) / r.width * 100); };
  split.addEventListener('pointerdown', e => { if (e.target === range) return; drag = true; split.setPointerCapture(e.pointerId); at(e); });
  split.addEventListener('pointermove', e => { if (drag || e.pointerType === 'mouse') at(e); });
  split.addEventListener('pointerup', () => { drag = false; });
  split.addEventListener('pointercancel', () => { drag = false; });
  range.addEventListener('input', () => set(+range.value));
})();
