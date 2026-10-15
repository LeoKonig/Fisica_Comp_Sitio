/*
 * descubrimientos.js
 * Física Computacional — fuente ÚNICA de datos del Códice de Descubrimientos.
 *
 * La consumen tanto la página del libro (codice.qmd) como el prototipo
 * (Códice de Descubrimientos.dc.html). Editar aquí actualiza ambos.
 *
 * Cada descubrimiento:
 *   id      — clave estable usada en localStorage (NO la cambies una vez publicada)
 *   sigil   — glifo del sello revelado
 *   title   — título del hallazgo
 *   insight — el descubrimiento (texto revelado)
 *   hint    — pista enigmática (sello sin romper)
 *   origin  — nota donde se rompe el sello
 */
window.DESCUBRIMIENTOS = {

  /* Paleta por ruta (clase del estudiante) */
  rutas: {
    racket:  { name: 'El Mago',       glyph: '\u2726', color: '#534AB7', tint: '#EEEDFE', deep: '#3C3489' },
    haskell: { name: 'La Nave', glyph: '\u2B21', color: '#0F6E56', tint: '#E1F5EE', deep: '#085041' },
    idris:   { name: 'El Distrito', glyph: '\uD83D\uDF02', color: '#993C1D', tint: '#FAECE7', deep: '#712B13' },
    agda:    { name: 'La Investigaci\u00f3n',    glyph: '\u221E', color: '#A8780C', tint: '#F6ECD4', deep: '#6F4E08' },
    ats:     { name: 'Applied Type System',    glyph: '\u2699', color: '#5F5E5A', tint: '#F1EFE8', deep: '#444441' },
    mercury: { name: 'El Monasterio',  glyph: '\u263F', color: '#185FA5', tint: '#E6F1FB', deep: '#0C447C' }
  },

  /* Tomos (uno por unidad) */
  tomos: [
    {
      roman: 'I', name: 'Escalas, Condici\u00f3n y Estabilidad', unit: 'Unidad 1',
      entries: [
        { id: 'noasoc', sigil: '\u2260', title: 'La suma olvida lo peque\u00f1o',
          insight: 'Sumar 10\u00b9\u2075, luego 1, luego \u221210\u00b9\u2075 no da lo mismo que reordenar los t\u00e9rminos: el 1 sobrevive o se desvanece seg\u00fan el orden. La adici\u00f3n en punto flotante no es asociativa, y el orden de las operaciones decide qu\u00e9 informaci\u00f3n se pierde.',
          hint: 'Tres n\u00fameros, dos \u00f3rdenes, dos resultados. Algo se extrav\u00eda cuando lo finito imita a lo infinito.',
          origin: 'u1/t1 · Punto flotante' },
        { id: 'epsilon', sigil: '\u03b5', title: 'El vac\u00edo junto al uno',
          insight: 'Entre 1.0 y el siguiente n\u00famero representable hay un hueco: el \u00e9psilon de m\u00e1quina (2\u207b\u2075\u00b2 \u2248 2.22\u00d710\u207b\u00b9\u2076). La cota de redondeo es a\u00fan la mitad, u = 2\u207b\u2075\u00b3. Por debajo de esa frontera, sumar no cambia nada.',
          hint: 'Hay un abismo invisible pegado al n\u00famero uno. Nada que quepa dentro de \u00e9l deja huella.',
          origin: 'u1/t1 · Punto flotante' },
        { id: 'dimtipos', sigil: '\u27e6\u27e7', title: 'Las dimensiones son un sistema de tipos',
          insight: 'Comprobar unidades es type-checking: las cantidades f\u00edsicas forman un \u00e1lgebra graduada por sus exponentes dimensionales, y sumar s\u00f3lo est\u00e1 permitido entre el mismo grado. Con tipos, E = mc\u00b3 es un error de compilaci\u00f3n.',
          hint: 'Que las unidades cuadren no es aritm\u00e9tica: es un sistema de tipos disfrazado de buena costumbre.',
          origin: 'u1/t2 · An\u00e1lisis dimensional' },
        { id: 'cancel', sigil: '\u2212', title: 'La cat\u00e1strofe de restar iguales',
          insight: 'Restar dos cantidades casi id\u00e9nticas aniquila las cifras significativas: el n\u00famero de condici\u00f3n (|x|+|y|)/|x\u2212y| diverge cuando x\u2248y. El resultado conserva el ruido y pierde la se\u00f1al.',
          hint: 'Dos gigantes casi iguales se restan, y de su choque s\u00f3lo queda polvo sin sentido.',
          origin: 'u1/t3 · Propagaci\u00f3n de errores' },
        { id: 'condestab', sigil: '\u2696', title: '\u00bfLa culpa es del problema o del algoritmo?',
          insight: 'La condici\u00f3n mide cu\u00e1nto amplifica el problema los errores; la estabilidad, cu\u00e1nto a\u00f1ade el algoritmo. Un m\u00e9todo estable sobre un problema mal condicionado falla, pero la culpa es del problema. Distinguirlo es el primer diagn\u00f3stico num\u00e9rico.',
          hint: 'Cuando el resultado sale mal hay dos sospechosos. S\u00f3lo uno es culpable cada vez.',
          origin: 'u1/t4 · Condici\u00f3n y estabilidad' }
      ]
    },
    {
      roman: 'II', name: 'Operaciones Matem\u00e1ticas B\u00e1sicas', unit: 'Unidad 2',
      entries: [
        { id: 'runge', sigil: '\u223f', title: 'Subir el grado puede empeorarlo todo',
          insight: 'Aumentar el grado del polinomio interpolador no garantiza mejor aproximaci\u00f3n: con nodos equiespaciados el error explota en los extremos (fen\u00f3meno de Runge). La cura no es m\u00e1s grado, sino nodos de Chebyshev o splines.',
          hint: 'Para acercarte m\u00e1s a\u00f1ades grados al polinomio\u2026 y se desboca justo por los bordes.',
          origin: 'u2/t1 · Interpolaci\u00f3n' },
        { id: 'dual', sigil: '\u2202', title: 'La derivada exacta sin l\u00edmite',
          insight: 'Los n\u00fameros duales (\u03b5\u00b2 = 0) calculan f\u2032(x) exactamente, sin h ni l\u00edmite: evaluar f en x+\u03b5 propaga la derivada por la propia aritm\u00e9tica. La regla de la cadena resulta ser un funtor, y la diferenciaci\u00f3n autom\u00e1tica, su consecuencia.',
          hint: 'Una cantidad cuyo cuadrado es cero convierte derivar en sumar y multiplicar. Sin l\u00edmites, sin error.',
          origin: 'u2/t3 · Diferenciaci\u00f3n autom\u00e1tica' },
        { id: 'pasoptimo', sigil: 'h\u22c6', title: 'El paso que no conviene achicar m\u00e1s',
          insight: 'En diferencias finitas el error de truncamiento baja con h, pero el de redondeo sube como \u03b5/h. Se cruzan en h\u2217 \u2248 \u03b5^{1/3} \u2248 10\u207b\u2075: achicar m\u00e1s el paso empeora el resultado. La diferenciaci\u00f3n autom\u00e1tica elimina el dilema.',
          hint: 'Para derivar mejor encoges el paso\u2026 hasta que encogerlo lo arruina. Hay un fondo.',
          origin: 'u2/t2 · Diferenciaci\u00f3n num\u00e9rica' },
        { id: 'montecarlo', sigil: '\u2684', title: 'El azar derrota a la dimensi\u00f3n',
          insight: 'Las cuadraturas deterministas mueren en alta dimensi\u00f3n (coste ~ \u03b5^{\u2212d/p}). Monte Carlo promedia sobre puntos aleatorios con error O(N^{\u22121/2}) independiente de la dimensi\u00f3n: en f\u00edsica estad\u00edstica y cu\u00e1ntica, a menudo el \u00fanico camino viable.',
          hint: 'Cuando las dimensiones se multiplican, dejar de calcular y empezar a apostar resulta m\u00e1s sabio.',
          origin: 'u2/t4 · Integraci\u00f3n' }
      ]
    },
    {
      roman: 'III', name: 'Ecuaciones Diferenciales Ordinarias', unit: 'Unidad 3',
      entries: [
        { id: 'simplectico', sigil: '\u222e', title: 'El integrador que no deja derivar la energ\u00eda',
          insight: 'Verlet preserva exactamente la forma simpl\u00e9ctica dq\u2227dp. No conserva la energ\u00eda exacta, pero la mantiene oscilando acotada durante tiempos exponencialmente largos, en lugar de derivar como Euler o RK4. Lo que compra es la ausencia de deriva.',
          hint: 'No conserva la energ\u00eda\u2026 y aun as\u00ed no la deja escapar en eones. Guarda intacta una forma.',
          origin: 'u3/t1 · M\u00e9todos simpl\u00e9cticos' },
        { id: 'rk4geom', sigil: '\u2a2f', title: 'Ning\u00fan Runge-Kutta expl\u00edcito honra la geometr\u00eda',
          insight: 'RK4 tiene error O(h\u2074), pero ning\u00fan m\u00e9todo de Runge-Kutta expl\u00edcito puede ser simpl\u00e9ctico: su matriz triangular es incompatible con la condici\u00f3n de simplecticidad. Preservar la estructura exige m\u00e9todos impl\u00edcitos o de splitting.',
          hint: 'El m\u00e9todo m\u00e1s popular de todos jam\u00e1s podr\u00e1 honrar la geometr\u00eda del espacio de fases.',
          origin: 'u3/t3 · Runge-Kutta' },
        { id: 'rigidez', sigil: '\u21cc', title: 'Lo r\u00e1pido obliga a frenar lo lento',
          insight: 'En un sistema r\u00edgido conviven escalas de tiempo muy dispares. Un m\u00e9todo expl\u00edcito debe usar un paso del tama\u00f1o del modo m\u00e1s r\u00e1pido, aunque el fen\u00f3meno de inter\u00e9s sea lento. Los m\u00e9todos impl\u00edcitos (A-estables) rompen esa tiran\u00eda.',
          hint: 'Aunque s\u00f3lo te importe lo lento, lo veloz te encadena a pasos min\u00fasculos. Salvo que cambies de m\u00e9todo.',
          origin: 'u3/t4 · Rigidez' },
        { id: 'caos', sigil: '\u273a', title: 'El mapa que amplifica lo diminuto',
          insight: 'En un sistema ca\u00f3tico la sensibilidad a las condiciones iniciales crece como e^{\u03bbt}, con \u03bb el exponente de Lyapunov. Predecir la trayectoria a largo plazo es imposible en principio, por mucha precisi\u00f3n que tenga el integrador.',
          hint: 'Un susurro en el inicio se vuelve un grito al final. Ninguna precisi\u00f3n basta.',
          origin: 'u3/t5 · Orden y caos' }
      ]
    },
    {
      roman: 'IV', name: 'An\u00e1lisis Matricial y Modos Normales', unit: 'Unidad 4',
      entries: [
        { id: 'condmatriz', sigil: '\u25eb', title: 'La matriz estira el espacio',
          insight: 'A env\u00eda la bola unitaria a un elipsoide de semiejes \u03c3\u1d62; el n\u00famero de condici\u00f3n \u03ba\u2082 = \u03c3_max/\u03c3_min mide su alargamiento. Si \u03ba\u2082 = 10\u1d4f, se pierden k d\u00edgitos de precisi\u00f3n al resolver Ax = b.',
          hint: 'Toda matriz deforma una esfera en un huevo. Cu\u00e1nto lo alarga es cu\u00e1nta precisi\u00f3n te cuesta.',
          origin: 'u4/t1 · Condici\u00f3n' },
        { id: 'cholesky', sigil: 'L', title: 'Si Cholesky falla, no era definida positiva',
          insight: 'Para matrices sim\u00e9tricas definidas positivas, la factorizaci\u00f3n A = LL\u1d40 cuesta la mitad y no necesita pivoteo. Y es un test: si Cholesky no existe, la matriz no es definida positiva. La existencia de la factorizaci\u00f3n equivale a la propiedad.',
          hint: 'Un algoritmo que, al fracasar, te revela una verdad sobre la matriz que intentabas factorizar.',
          origin: 'u4/t1 · Cholesky' },
        { id: 'lazyiter', sigil: '\u221e', title: 'Generar lo infinito, detenerse al converger',
          insight: 'Un m\u00e9todo iterativo es un flujo perezoso e infinito de aproximaciones \u2014 iterate step \u03c6\u2080 \u2014 del que un consumidor independiente toma la primera aceptable. La generaci\u00f3n (\u00e1lgebra) y la terminaci\u00f3n (tolerancia) quedan completamente separadas.',
          hint: 'Produces una lista sin fin de respuestas y, aparte, decides cu\u00e1ndo una basta. Nunca se tocan.',
          origin: 'u4/t3 · M\u00e9todos iterativos' },
        { id: 'krylov', sigil: '\uD835\uDCA6', title: 'Buscar en el espacio que el problema engendra',
          insight: 'Los m\u00e9todos de Krylov buscan la soluci\u00f3n en span{b, Ab, A\u00b2b, \u2026}. El Gradiente Conjugado converge para matrices SPD en O(\u221a\u03ba\u00b7log(1/\u03b5)) iteraciones; un precondicionador que reduzca \u03ba lo acelera. Han reemplazado a Jacobi y SOR.',
          hint: 'La soluci\u00f3n se esconde en un subespacio que la propia matriz va tejiendo al multiplicar.',
          origin: 'u4/t3 · Krylov' }
      ]
    },
    {
      roman: 'V', name: 'Problemas Cl\u00e1sicos y Cu\u00e1nticos de Valores Propios', unit: 'Unidad 5',
      entries: [
        { id: 'numerov', sigil: '\u2462', title: 'Tres puntos m\u00e1s precisos que cuatro',
          insight: 'Numerov resuelve y\u2033 = f\u00b7y con error local O(h\u2076) usando s\u00f3lo una recurrencia de tres puntos, sin evaluaciones intermedias: aprovecha que no hay t\u00e9rmino en y\u2032. M\u00e1s preciso que RK4 con menos trabajo, para esa clase de ecuaciones.',
          hint: 'Una recurrencia de tres puntos vence en precisi\u00f3n a cuatro evaluaciones. El secreto: falta un t\u00e9rmino.',
          origin: 'u5/t1 · Numerov' },
        { id: 'shooting', sigil: '\u25ce', title: 'Disparar energ\u00edas hasta dar en el cero',
          insight: 'El problema de frontera se vuelve la b\u00fasqueda del cero de una funci\u00f3n f(E): integras desde ambos extremos, comparas en un punto y ajustas E por bisecci\u00f3n. La derivada logar\u00edtmica mantiene todo acotado donde \u03c8 querr\u00eda desbordarse.',
          hint: 'Eliges una energ\u00eda, disparas desde los dos lados y miras si las soluciones se encuentran. Si no, corriges.',
          origin: 'u5/t2 · Shooting method' },
        { id: 'variacional', sigil: '\u2265', title: 'Toda energ\u00eda de prueba cae del lado alto',
          insight: 'El cociente de Rayleigh cumple R[\u03c8] \u2265 E\u2080 para cualquier funci\u00f3n de prueba. Con bases anidadas las energ\u00edas descienden mon\u00f3tonamente hacia la exacta: puedes acotar el estado fundamental sin conocer la soluci\u00f3n. (Cuidado: las diferencias finitas no son variacionales.)',
          hint: 'Cualquier conjetura que hagas sobre la energ\u00eda m\u00ednima caer\u00e1 siempre por encima. Nunca por debajo.',
          origin: 'u5/t4 · M\u00e9todos variacionales' },
        { id: 'unitario', sigil: '\u27f2', title: 'El paso temporal que conserva la probabilidad',
          insight: 'Evolucionar Schr\u00f6dinger exige un mapa unitario que conserve \u2016\u03c8\u2016\u00b2 = 1. Crank-Nicolson usa la transformada de Cayley \u2014unitaria exactamente para cualquier h\u2014 y split-operator factoriza e^{\u2212iHt} con FFT. Euler expl\u00edcito, en cambio, infla la norma sin remedio.',
          hint: 'La probabilidad total debe permanecer en uno. S\u00f3lo ciertos pasos temporales saben no derramarla.',
          origin: 'u5/t5 · Schr\u00f6dinger temporal' }
      ]
    }
  ]
};
