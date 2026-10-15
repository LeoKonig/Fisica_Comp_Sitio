/*
 * mapa.js
 * Física Computacional — datos del Mapa del Conocimiento (carta celeste).
 *
 * Lo consumen el Mapa-mundi (prototipo .dc.html) y la página del libro (mapa.qmd).
 * Coordenadas en un espacio virtual de 1000 × 600 (se reescalan al contenedor).
 *
 *   nodos    — { id, label, unit, title, x, y, url }
 *   aristas  — [from, to]  (caminos entre temas: secuencia + referencias cruzadas)
 *   regiones — { unit, rn, name, x, y }  (rótulos de constelación)
 *   inicio   — nodo siempre disponible (de donde parte la niebla)
 */
window.MAPA_CONOCIMIENTO = {

  inicio: 'u1t1',

  regiones: [
    { unit: 1, rn: 'I',   name: 'Escalas y Estabilidad',         x: 150, y: 120 },
    { unit: 2, rn: 'II',  name: 'Operaciones B\u00e1sicas',       x: 345, y: 120 },
    { unit: 3, rn: 'III', name: 'Ecuaciones Diferenciales',      x: 545, y: 120 },
    { unit: 4, rn: 'IV',  name: 'An\u00e1lisis Matricial',        x: 730, y: 150 },
    { unit: 5, rn: 'V',   name: 'Valores Propios',               x: 905, y: 120 }
  ],

  nodos: [
    { id: 'u1t1', label: 'U1·T1', unit: 1, title: 'Sistemas num\u00e9ricos de punto flotante',           x: 140, y: 330, url: 'secciones/u1t1.html' },
    { id: 'u1t2', label: 'U1·T2', unit: 1, title: 'An\u00e1lisis dimensional y estabilidad',              x: 95,  y: 235, url: 'secciones/u1t2.html' },
    { id: 'u1t3', label: 'U1·T3', unit: 1, title: 'Propagaci\u00f3n y amplificaci\u00f3n de errores',      x: 205, y: 275, url: 'secciones/u1t3.html' },
    { id: 'u1t4', label: 'U1·T4', unit: 1, title: 'Estabilidad num\u00e9rica y condici\u00f3n',             x: 215, y: 400, url: 'secciones/u1t4.html' },
    { id: 'u1t5', label: 'U1·T5', unit: 1, title: 'Condici\u00f3n de problemas, estabilidad de algoritmos', x: 120, y: 460, url: 'secciones/u1t5.html' },

    { id: 'u2t1', label: 'U2·T1', unit: 2, title: 'Interpolaci\u00f3n y extrapolaci\u00f3n',                x: 330, y: 200, url: 'secciones/u2t1.html' },
    { id: 'u2t2', label: 'U2·T2', unit: 2, title: 'M\u00e9todos centrados y truncamiento',                x: 400, y: 265, url: 'secciones/u2t2.html' },
    { id: 'u2t3', label: 'U2·T3', unit: 2, title: 'Diferenciaci\u00f3n num\u00e9rica vs. autom\u00e1tica',   x: 330, y: 340, url: 'secciones/u2t3.html' },
    { id: 'u2t4', label: 'U2·T4', unit: 2, title: 'Integraci\u00f3n num\u00e9rica',                         x: 410, y: 415, url: 'secciones/u2t4.html' },
    { id: 'u2t5', label: 'U2·T5', unit: 2, title: 'Comparaci\u00f3n num\u00e9rica/anal\u00edtica y convergencia', x: 320, y: 485, url: 'secciones/u2t5.html' },
    { id: 'u2t6', label: 'U2·T6', unit: 2, title: 'B\u00fasqueda de ra\u00edces: bisecci\u00f3n, Newton y secante', x: 290, y: 415, url: 'secciones/u2t6.html' },

    { id: 'u3t1', label: 'U3·T1', unit: 3, title: 'Euler, Heun, Verlet (simpl\u00e9cticos)',               x: 540, y: 225, url: 'secciones/u3t1.html' },
    { id: 'u3t2', label: 'U3·T2', unit: 3, title: 'M\u00e9todos impl\u00edcitos y multipasos',              x: 605, y: 300, url: 'secciones/u3t2.html' },
    { id: 'u3t3', label: 'U3·T3', unit: 3, title: 'Runge-Kutta y adaptativos',                           x: 505, y: 355, url: 'secciones/u3t3.html' },
    { id: 'u3t4', label: 'U3·T4', unit: 3, title: 'Estabilidad de soluciones y rigidez',                 x: 575, y: 430, url: 'secciones/u3t4.html' },
    { id: 'u3t5', label: 'U3·T5', unit: 3, title: 'Orden y caos en dos dimensiones',                     x: 495, y: 500, url: 'secciones/u3t5.html' },

    { id: 'u4t1', label: 'U4·T1', unit: 4, title: 'Inversi\u00f3n de matrices y condici\u00f3n',            x: 710, y: 285, url: 'secciones/u4t1.html' },
    { id: 'u4t2', label: 'U4·T2', unit: 4, title: 'Valores propios: algoritmo QR',                       x: 775, y: 360, url: 'secciones/u4t2.html' },
    { id: 'u4t3', label: 'U4·T3', unit: 4, title: 'Laplace discreta y m\u00e9todos iterativos',           x: 695, y: 435, url: 'secciones/u4t3.html' },

    { id: 'u5t1', label: 'U5·T1', unit: 5, title: 'Numerov y Schr\u00f6dinger 1D',                        x: 900, y: 210, url: 'secciones/u5t1.html' },
    { id: 'u5t2', label: 'U5·T2', unit: 5, title: 'Condiciones de frontera (shooting)',                  x: 950, y: 290, url: 'secciones/u5t2.html' },
    { id: 'u5t3', label: 'U5·T3', unit: 5, title: 'Formulaci\u00f3n matricial de valores propios',        x: 875, y: 355, url: 'secciones/u5t3.html' },
    { id: 'u5t4', label: 'U5·T4', unit: 5, title: 'M\u00e9todos variacionales',                           x: 935, y: 430, url: 'secciones/u5t4.html' },
    { id: 'u5t5', label: 'U5·T5', unit: 5, title: 'Schr\u00f6dinger temporal: Crank-Nicolson, split-operator', x: 880, y: 495, url: 'secciones/u5t5.html' }
  ],

  aristas: [
    /* Unidad 1 */
    ['u1t1','u1t2'], ['u1t1','u1t3'], ['u1t3','u1t4'], ['u1t4','u1t5'], ['u1t1','u1t4'],
    /* Unidad 2 */
    ['u2t1','u2t2'], ['u2t2','u2t3'], ['u2t3','u2t4'], ['u2t4','u2t5'], ['u2t1','u2t3'],
    /* Unidad 3 */
    ['u3t1','u3t2'], ['u3t1','u3t3'], ['u3t3','u3t4'], ['u3t4','u3t5'], ['u3t2','u3t4'],
    /* Unidad 4 */
    ['u4t1','u4t2'], ['u4t2','u4t3'], ['u4t1','u4t3'],
    /* Unidad 5 */
    ['u5t1','u5t2'], ['u5t1','u5t3'], ['u5t3','u5t4'], ['u5t4','u5t5'], ['u5t2','u5t3'],
    /* Puentes entre unidades (la travesía) */
    ['u1t4','u2t1'], ['u2t4','u3t1'], ['u3t4','u4t1'], ['u4t2','u5t1'],
    /* Ley-líneas: referencias cruzadas reales de las notas */
    ['u1t4','u4t1'], ['u3t1','u5t5'], ['u4t2','u5t3'],
    /* U2·T6: le apuntan u1t3 y u1t4; apunta a u3t2 y u5t2 */
    ['u1t3','u2t6'], ['u1t4','u2t6'], ['u2t6','u3t2'], ['u2t6','u5t2']
  ]
};
