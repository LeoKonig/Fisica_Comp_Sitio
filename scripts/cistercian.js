// cistercian.js
function cistercian(n, opts) {
  opts = opts || {};
  var sz  = opts.sz  || '1.2em';  // Tamaño por defecto
  var sw  = opts.sw  || 2.5;      // Grosor por defecto
  var cap = opts.cap || 'square';

  // Grilla de puntos (idéntica a tu código)
  var P = [
    [10,10],[30,10],[50,10],
    [10,30],[30,30],[50,30],
    [10,50],[30,50],[50,50],
    [10,60],[30,60],[50,60],
    [10,80],[30,80],[50,80]
  ];

  // Definición de glifos
  var G = {
    0:[[1,13]],
    1:[[1,13],[1,2]],    10:[[1,13],[0,1]],    100:[[1,13],[14,13]],  1000:[[1,13],[12,13]],
    2:[[1,13],[4,5]],    20:[[1,13],[3,4]],    200:[[1,13],[10,11]],  2000:[[1,13],[9,10]],
    3:[[1,13],[1,5]],    30:[[1,13],[1,3]],    300:[[1,13],[13,11]],  3000:[[1,13],[13,9]],
    4:[[1,13],[4,2]],    40:[[1,13],[4,0]],    400:[[1,13],[10,14]],  4000:[[1,13],[10,12]],
    5:[[1,13],[1,2],[2,4]], 50:[[1,13],[0,1],[0,4]],
    500:[[1,13],[13,14],[14,10]], 5000:[[1,13],[13,12],[12,10]],
    6:[[1,13],[2,5]],    60:[[1,13],[0,3]],    600:[[1,13],[14,11]],  6000:[[1,13],[12,9]],
    7:[[1,13],[1,2],[2,5]], 70:[[1,13],[0,1],[0,3]],
    700:[[1,13],[13,14],[14,11]], 7000:[[1,13],[13,12],[12,9]],
    8:[[1,13],[4,5],[5,2]], 80:[[1,13],[4,3],[3,0]],
    800:[[1,13],[10,11],[11,14]], 8000:[[1,13],[12,9],[9,10]],
    9:[[1,13],[1,2],[2,5],[5,4]], 90:[[1,13],[0,1],[0,3],[3,4]],
    900:[[1,13],[13,14],[14,11],[11,10]], 9000:[[1,13],[13,12],[12,9],[9,10]]
  };

  n = Math.max(0, Math.min(9999, Math.floor(n)));
  var d = [];

  function ln(a, b) {
    d.push('M' + P[a][0] + ' ' + P[a][1] + ' L' + P[b][0] + ' ' + P[b][1]);
  }

  if (G[n]) {
    G[n].forEach(function(g) { ln(g[0], g[1]); });
  } else {
    n.toString().split('').reverse().forEach(function(c, i) {
      var v = parseInt(c, 10) * Math.pow(10, i);
      if (G[v]) G[v].forEach(function(g) { ln(g[0], g[1]); });
    });
    if (d.length === 0) ln(1, 13);
  }

  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 90" width="' + sz +
    '" height="' + sz + '" style="display:inline-block;vertical-align:middle">' +
    '<path d="' + d.join(' ') + '" fill="none" stroke="currentColor" stroke-width="' + sw +
    '" stroke-linecap="' + cap + '" stroke-linejoin="miter"/></svg>';
}

// Hacer la función global
window.cistercian = cistercian;

// Inicialización: reemplaza elementos con clase "cistercian"
document.addEventListener('DOMContentLoaded', function() {
  document.querySelectorAll('.cistercian').forEach(function(el) {
    var num = parseInt(el.getAttribute('data-num') || el.textContent.trim());
    el.innerHTML = cistercian(num, {sz: '1.2em', sw: 2.5});
  });
});
