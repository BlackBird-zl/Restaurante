// Reveals lentos e discretos. Só actua com JS e sem prefers-reduced-motion.
(function () {
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var io = 'IntersectionObserver' in window ? new IntersectionObserver(function (es) {
    es.forEach(function (e) { if (e.isIntersecting) { show(e.target); io.unobserve(e.target); } });
  }, { rootMargin: '0px 0px -6% 0px', threshold: 0.06 }) : null;
  function show(el) { el.style.opacity = '1'; el.style.transform = 'none'; }
  function prep(el) {
    if (el.__patio) return; el.__patio = 1;
    if (reduce || !io || document.documentElement.dataset.motion === 'off') return;
    var kind = el.getAttribute('data-reveal') || 'rise';
    var ease = 'cubic-bezier(.2,.7,.2,1)';
    el.style.transition = 'opacity 1.1s ' + ease + ', transform ' + (kind === 'scale' ? '2.4s ' : '1.4s ') + ease;
    el.style.transitionDelay = (el.getAttribute('data-delay') || 0) + 'ms';
    el.style.opacity = kind === 'scale' ? '0.001' : '0';
    el.style.transform = kind === 'scale' ? 'scale(1.06)' : 'translateY(16px)';
    io.observe(el);
  }
  function scan() { document.querySelectorAll('[data-reveal]').forEach(prep); }
  new MutationObserver(scan).observe(document.documentElement, { childList: true, subtree: true });
  if (document.readyState !== 'loading') scan(); else document.addEventListener('DOMContentLoaded', scan);
  // salvaguarda: nada fica escondido se o observador falhar
  setTimeout(function () { document.querySelectorAll('[data-reveal]').forEach(function (el) {
    var r = el.getBoundingClientRect(); if (r.top < innerHeight && r.bottom > 0) show(el);
  }); }, 2500);
})();
