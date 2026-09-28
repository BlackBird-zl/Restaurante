/* A Casa · assinala o dia da semana na tabela (sem indicar se está aberto) */
(function(){
  const {lisbonNow} = window.Miolo;
  const d = lisbonNow().day, row = document.querySelector('#week tr[data-d="' + d + '"]');
  if (row) row.classList.add('today');
})();
