/*
 * temas-descanso.js
 * Física Computacional — reskins temáticos de La Hoguera y El Comerciante
 * por lenguaje (ruta del estudiante). Lo consumen hoguera.qmd y comerciante.qmd.
 *
 * Racket usa el diseño original (hardcodeado en cada .qmd) y NO aparece aquí:
 * su estética de fantasía oscura/hoguera literal ya encaja con su tema, así
 * que no se reemplaza. Cualquier lenguaje sin entrada aquí cae al diseño
 * original también (ya cubiertos: Haskell, Idris, Agda, ATS, Mercury).
 *
 * Añadir un lenguaje nuevo: agrega una clave (el id de la ruta, ver
 * descubrimientos.js → rutas) con la misma forma que 'haskell' o 'mercury'.
 * El color/nombre/glifo de la insignia de ruta siguen viniendo de
 * descubrimientos.js — aquí solo vive el copy y la mercancía del bazar.
 */
window.TEMAS_DESCANSO = {

  haskell: {
    hoguera: {
      title: 'La Bahía de Observación',
      heroSubtitle: 'Aparta la mirada de los sensores. La nave sostiene tu rumbo mientras te recuperas: ninguna coordenada conquistada se pierde.',
      breath: {
        sectionTitle: 'Estabiliza',
        kicker: function (cycle) { return 'Ciclo de soporte vital · 4·4·4·4 · ciclo ' + cycle; },
        intro: 'Sigue el núcleo: se expande al inhalar, se sostiene, mengua al exhalar. Cuatro ciclos bastan para que los sensores vitales vuelvan a la normalidad antes de retomar la guardia.',
        startLabel: 'Iniciar la recalibración'
      },
      stretch: {
        sectionTitle: 'Recalibra el cuerpo',
        kickerActive: function (i, total) { return 'Protocolo de bioingeniería · estación ' + i + ' / ' + total; },
        kickerIdle: function (total) { return 'Protocolo de bioingeniería · ' + total + ' estaciones'; },
        kickerDone: 'Protocolo de bioingeniería · completo',
        intro: 'Seis estaciones de calibración postural, cada una sostenida un breve conteo. Desconéctate de la consola, ponte de pie y sigue la cuenta regresiva.',
        startLabel: 'Iniciar protocolo',
        activeLabelPrefix: 'Estación',
        doneMessage: 'Protocolo completo. Los sensores biométricos vuelven a verde — la guardia puede continuar sin fricción.'
      },
      rule: {
        body: 'Cada <strong style="color:#EFE3CE;">20 minutos</strong> frente a los monitores, dirige la vista a un punto a <strong style="color:#EFE3CE;">20 pies</strong> (unos 6 m) durante <strong style="color:#EFE3CE;">20 segundos</strong>. Relaja el enfoque óptico antes de que los sensores se fatiguen.'
      },
      rest: {
        buttonLabel: '⟡ Registrar bitácora y descansar',
        statusSome: function (n, hh) { return 'Has registrado ' + n + (n === 1 ? ' pausa' : ' pausas') + ' en la bitácora. Tu rumbo está a salvo' + (hh ? ' · última pausa ' + hh : '') + '.'; },
        statusNone: 'Tu rumbo ya está a salvo. Vuelve cuando lo necesites.'
      }
    },
    comerciante: {
      kicker: 'Física Computacional · Banco de Datos de la Nave',
      title: 'El Archivo Central',
      quote: '«Consulta autorizada. El Archivo conserva cada protocolo de mantenimiento jamás registrado a bordo — instálalos y la fatiga del viaje disminuye.»',
      currencyLabel: 'unidades',
      wares: [
        { id: 'colemak', glyph: '\u2328', costo: 60, cat: 'Protocolo · Prioridad Alta', name: 'El Protocolo de Disposición Neural', real: 'Cambiar de QWERTY a Colemak-DH', tip: 'El estándar QWERTY se diseñó para máquinas mecánicas del siglo pasado, no para tu sistema nervioso. Este protocolo reubica los comandos más frecuentes bajo los dedos que menos viajan: la fricción de cada turno cae, aunque la adaptación tome semanas de entrenamiento.' },
        { id: 'split', glyph: '\u2453', costo: 55, cat: 'Hardware · Ergonómico', name: 'El Panel de Control Bipartito', real: 'Teclado split / columnar', tip: 'Un panel dividido permite que los hombros se abran a su ángulo natural, sin forzar las muñecas hacia adentro. La postura deja de pelear contra la geometría de la consola.' },
        { id: 'modal', glyph: '\u2756', costo: 45, cat: 'Protocolo · Eficiencia', name: 'El Protocolo de Comando Directo', real: 'Vim / movimiento por teclado', tip: 'Cada viaje de la mano hacia el panel táctil es tiempo de reacción perdido. Navegar y editar sin abandonar los comandos base mantiene las manos quietas y la atención en la misión.' },
        { id: 'tiling', glyph: '\u25f0', costo: 40, cat: 'Software · Navegación', name: 'El Sistema de Cuadrantes', real: 'Tiling WM / atajos de ventanas', tip: 'Organizar las pantallas de control por comando, no arrastrándolas, ahorra cientos de gestos finos por turno. Menos manipulación manual, más foco en los datos.' },
        { id: 'reposa', glyph: '\u2334', costo: 25, cat: 'Hardware · Soporte', name: 'El Soporte de Gravedad Cero', real: 'Soporte de muñeca neutro', tip: 'La muñeca debe flotar recta frente a la consola, nunca doblarse sobre el borde. Un soporte que mantenga el ángulo neutro evita comprimir el nervio mediano — el origen de la mayoría de las fallas del sistema motor.' },
        { id: 'pie', glyph: '\u2191', costo: 50, cat: 'Hardware · Postural', name: 'La Consola Ajustable', real: 'Escritorio de pie / alternar postura', tip: 'Ningún tripulante fue diseñado para una sola postura durante un turno completo. Alternar entre sentado y de pie cada media hora reactiva la circulación y descarga la espalda baja.' },
        { id: 'flux', glyph: '\u263E', costo: 20, cat: 'Software · Nocturno', name: 'El Filtro de Luz Estelar', real: 'Filtro de luz cálida (f.lux / Night Shift)', tip: 'Al avanzar el ciclo de turno, la luz fría de los monitores confunde al reloj biológico. Un filtro que entibie los tonos protege el descanso — y un buen descanso es la mitad de cualquier misión.' },
        { id: 'pomodoro', glyph: '\u25d4', costo: 15, cat: 'Protocolo · Temporal', name: 'El Cronómetro de Turno', real: 'Técnica Pomodoro (25 + 5)', tip: '25 minutos de guardia activa, 5 de descanso. El límite no te frena: te protege de los turnos interminables que arruinan muñecas, ojos y concentración. Cada pausa es una breve escala en la bahía de observación.' }
      ]
    }
  },

  mercury: {
    hoguera: {
      title: 'El Despacho de Investigación',
      heroSubtitle: 'Deja el expediente un momento. El despacho guarda tus notas mientras descansas: ninguna pista se pierde.',
      breath: {
        sectionTitle: 'Serena la mente',
        kicker: function (cycle) { return 'Respiración en caja · método de concentración · ciclo ' + cycle; },
        intro: 'Sigue el resplandor de la lámpara: crece al inhalar, se sostiene, mengua al exhalar. Cuatro ciclos aclaran el juicio antes de volver al caso.',
        startLabel: 'Iniciar la reflexión'
      },
      stretch: {
        sectionTitle: 'Ejercita el cuerpo del investigador',
        kickerActive: function (i, total) { return 'Rutina contra la fatiga del escritorio · postura ' + i + ' / ' + total; },
        kickerIdle: function (total) { return 'Rutina contra la fatiga del escritorio · ' + total + ' posturas'; },
        kickerDone: 'Rutina contra la fatiga del escritorio · completa',
        intro: 'Seis posturas breves, cada una sostenida unos segundos. Levántate del escritorio, suelta la pluma y sigue el conteo.',
        startLabel: 'Comenzar la rutina',
        activeLabelPrefix: 'Postura',
        doneMessage: 'Rutina completa. Manos y cuello descansan — la mente vuelve afilada al expediente.'
      },
      rule: {
        body: 'Cada <strong style="color:#EFE3CE;">20 minutos</strong> sobre el expediente, dirige la mirada a un punto a <strong style="color:#EFE3CE;">20 pies</strong> (unos 6 m) durante <strong style="color:#EFE3CE;">20 segundos</strong>. Relaja el enfoque antes de que la vista se canse de tanta letra menuda.'
      },
      rest: {
        buttonLabel: '⟡ Cerrar el expediente y descansar',
        statusSome: function (n, hh) { return 'Has cerrado el expediente ' + n + (n === 1 ? ' vez' : ' veces') + '. Tus notas están a salvo' + (hh ? ' · última pausa ' + hh : '') + '.'; },
        statusNone: 'Tus notas ya están a salvo. Vuelve cuando lo necesites.'
      }
    },
    comerciante: {
      kicker: 'Física Computacional · El Gabinete de Curiosidades',
      title: 'El Anticuario',
      quote: '«Adelante, pase. Lo que aquí se guarda no son antigüedades cualquiera: son instrumentos que a cualquier investigador le ahorran un poco del desgaste del oficio.»',
      currencyLabel: 'evidencias',
      wares: [
        { id: 'colemak', glyph: '\u2328', costo: 60, cat: 'Instrumento · Prioridad', name: 'La Disposición del Escribano', real: 'Cambiar de QWERTY a Colemak-DH', tip: 'QWERTY nació para máquinas de escribir victorianas, no para la mano de un investigador moderno. Esta disposición mantiene las letras frecuentes bajo los dedos que menos se desplazan: menos desgaste, misma pluma.' },
        { id: 'split', glyph: '\u2453', costo: 55, cat: 'Mueble · Ergonómico', name: 'El Atril Partido', real: 'Teclado split / columnar', tip: 'Un atril dividido permite que los hombros se abran, sin forzar las muñecas contra el borde del escritorio. La postura deja de pelear contra el mobiliario.' },
        { id: 'modal', glyph: '\u2756', costo: 45, cat: 'Técnica · Eficiencia', name: 'El Método de Taquigrafía Rápida', real: 'Vim / movimiento por teclado', tip: 'Cada vez que la mano abandona la pluma para tomar la lupa, se pierde el hilo del razonamiento. Anotar y corregir sin soltar la escritura mantiene la mente en el caso.' },
        { id: 'tiling', glyph: '\u25f0', costo: 40, cat: 'Método · Organización', name: 'El Archivador de Expedientes Ordenado', real: 'Tiling WM / atajos de ventanas', tip: 'Ordenar los documentos por sistema, no amontonándolos, ahorra cientos de búsquedas al día. Menos papeleo disperso, más claridad para deducir.' },
        { id: 'reposa', glyph: '\u2334', costo: 25, cat: 'Mueble · Soporte', name: 'El Cojín de Terciopelo', real: 'Soporte de muñeca neutro', tip: 'La muñeca debe reposar recta sobre el escritorio, no doblarse contra el canto de la madera. Un cojín que mantenga el ángulo neutro evita comprimir el nervio — la raíz de más de un caso de mano temblorosa.' },
        { id: 'pie', glyph: '\u2191', costo: 50, cat: 'Mueble · Postural', name: 'El Atril de Pie', real: 'Escritorio de pie / alternar postura', tip: 'Ningún investigador razona bien clavado en la misma silla por horas. Alternar entre sentarse y trabajar de pie cada media hora reactiva la circulación y despeja la espalda.' },
        { id: 'flux', glyph: '\u263E', costo: 20, cat: 'Instrumento · Nocturno', name: 'La Lámpara de Gas Ámbar', real: 'Filtro de luz cálida (f.lux / Night Shift)', tip: 'Al caer la noche, la luz blanca de una lámpara común ahuyenta el sueño. Una luz que se entibie con las horas protege el descanso — y un buen descanso resuelve más casos que una vela encendida hasta el alba.' },
        { id: 'pomodoro', glyph: '\u25d4', costo: 15, cat: 'Instrumento · Temporal', name: 'El Reloj de Bolsillo', real: 'Técnica Pomodoro (25 + 5)', tip: 'Veinticinco minutos de investigación, cinco de pausa. El límite no interrumpe el caso: protege la vista, la muñeca y el juicio de las sesiones interminables. Cada pausa es una breve visita al despacho.' }
      ]
    }
  },

  idris: {
    hoguera: {
      title: 'La Estación de Sincronización',
      heroSubtitle: 'Desconecta los actuadores un momento. La estación retiene tu estado mientras te recalibras: ningún proceso verificado se pierde.',
      breath: {
        sectionTitle: 'Sincroniza',
        kicker: function (cycle) { return 'Ciclo de recalibración · 4·4·4·4 · ciclo ' + cycle; },
        intro: 'Sigue el núcleo de sincronización: se expande al inhalar, se sostiene, mengua al exhalar. Cuatro ciclos devuelven la señal a rango nominal antes de reanudar la ejecución.',
        startLabel: 'Iniciar sincronización'
      },
      stretch: {
        sectionTitle: 'Recalibra los actuadores',
        kickerActive: function (i, total) { return 'Diagnóstico de firmware · actuador ' + i + ' / ' + total; },
        kickerIdle: function (total) { return 'Diagnóstico de firmware · ' + total + ' actuadores'; },
        kickerDone: 'Diagnóstico de firmware · completo',
        intro: 'Seis rutinas de calibración articular, cada una sostenida un breve conteo. Suspende la ejecución, ponte de pie y sigue la cuenta regresiva.',
        startLabel: 'Iniciar diagnóstico',
        activeLabelPrefix: 'Actuador',
        doneMessage: 'Diagnóstico completo. Los actuadores reportan verde — el sistema puede ejecutar sin fricción mecánica.'
      },
      rule: {
        body: 'Cada <strong style="color:#EFE3CE;">20 minutos</strong> de visión aumentada, dirige los sensores ópticos a un punto a <strong style="color:#EFE3CE;">20 pies</strong> (unos 6 m) durante <strong style="color:#EFE3CE;">20 segundos</strong>. Relaja el enfoque antes de que el lente se sobrecaliente.'
      },
      rest: {
        buttonLabel: '⟡ Guardar el estado y sincronizar',
        statusSome: function (n, hh) { return 'Has sincronizado tu estado ' + n + (n === 1 ? ' vez' : ' veces') + '. Tu progreso verificado está a salvo' + (hh ? ' · última sincronización ' + hh : '') + '.'; },
        statusNone: 'Tu estado ya está sincronizado. Vuelve cuando lo necesites.'
      }
    },
    comerciante: {
      kicker: 'Física Computacional · Bahía de Mantenimiento',
      title: 'El Ingeniero Cibernético',
      quote: '«Firmware verificado, listo para instalar. Cada módulo que integras a tu chasis reduce el desgaste mecánico de la misión.»',
      currencyLabel: 'fragmentos',
      wares: [
        { id: 'colemak', glyph: '\u2328', costo: 60, cat: 'Firmware · Prioridad Alta', name: 'El Firmware de Disposición Neural', real: 'Cambiar de QWERTY a Colemak-DH', tip: 'QWERTY fue diseñado para mecanismos de palanca del siglo pasado, no para tu sistema motor. Este firmware reubica los comandos más frecuentes bajo los actuadores que menos se desplazan: la fricción de cada ciclo cae, aunque la recalibración tome semanas.' },
        { id: 'split', glyph: '\u2453', costo: 55, cat: 'Hardware · Ergonómico', name: 'El Chasis de Entrada Bipartito', real: 'Teclado split / columnar', tip: 'Un chasis de entrada dividido permite que los hombros se abran a su ángulo natural, sin forzar las muñecas hacia adentro. La postura deja de pelear contra la geometría del exoesqueleto.' },
        { id: 'modal', glyph: '\u2756', costo: 45, cat: 'Firmware · Eficiencia', name: 'El Protocolo de Ejecución Directa', real: 'Vim / movimiento por teclado', tip: 'Cada desplazamiento del brazo hacia el panel táctil es latencia perdida. Navegar y editar sin abandonar los comandos base mantiene los actuadores quietos y el procesador enfocado.' },
        { id: 'tiling', glyph: '\u25f0', costo: 40, cat: 'Software · Navegación', name: 'El Gestor de Particiones Visuales', real: 'Tiling WM / atajos de ventanas', tip: 'Organizar las pantallas por comando, no arrastrándolas con el brazo, ahorra cientos de micro-movimientos por turno. Menos desgaste articular, más ancho de banda cognitivo.' },
        { id: 'reposa', glyph: '\u2334', costo: 25, cat: 'Hardware · Soporte', name: 'El Soporte de Muñeca Servoasistido', real: 'Soporte de muñeca neutro', tip: 'La muñeca debe flotar recta frente al panel, nunca doblarse sobre el borde. Un soporte que mantenga el ángulo neutro evita comprimir el nervio mediano — la falla más común del sistema motor humano.' },
        { id: 'pie', glyph: '\u2191', costo: 50, cat: 'Hardware · Postural', name: 'El Chasis de Postura Variable', real: 'Escritorio de pie / alternar postura', tip: 'Ningún cuerpo, biológico o aumentado, fue diseñado para una sola postura durante un turno completo. Alternar entre sentado y de pie cada media hora reactiva la circulación y descarga la columna.' },
        { id: 'flux', glyph: '\u263E', costo: 20, cat: 'Software · Nocturno', name: 'El Filtro de Espectro Cálido', real: 'Filtro de luz cálida (f.lux / Night Shift)', tip: 'Al avanzar el ciclo, la luz fría de los monitores confunde al reloj biológico que aún corre bajo el chasis. Un filtro que entibie los tonos protege el descanso — y un buen descanso es la mitad de cualquier ejecución.' },
        { id: 'pomodoro', glyph: '\u25d4', costo: 15, cat: 'Firmware · Temporal', name: 'El Temporizador de Ciclo de Ejecución', real: 'Técnica Pomodoro (25 + 5)', tip: '25 minutos de ejecución activa, 5 de reposo. El límite no te frena: te protege de los ciclos interminables que degradan muñecas, sensores ópticos y concentración. Cada pausa es una breve visita a la estación de sincronización.' }
      ]
    }
  },

  agda: {
    hoguera: {
      title: 'La Sala de Escucha',
      heroSubtitle: 'Aparta los auriculares un momento. El observatorio sigue registrando mientras descansas: ninguna transmisión captada se pierde.',
      breath: {
        sectionTitle: 'Sintoniza',
        kicker: function (cycle) { return 'Ciclo de sintonía · 4·4·4·4 · ciclo ' + cycle; },
        intro: 'Sigue la señal: crece al inhalar, se sostiene, mengua al exhalar. Cuatro ciclos despejan la estática antes de volver a escuchar.',
        startLabel: 'Iniciar la sintonía'
      },
      stretch: {
        sectionTitle: 'Calibra el cuerpo del observador',
        kickerActive: function (i, total) { return 'Bitácora de observación · registro ' + i + ' / ' + total; },
        kickerIdle: function (total) { return 'Bitácora de observación · ' + total + ' registros'; },
        kickerDone: 'Bitácora de observación · completa',
        intro: 'Seis registros posturales breves, cada uno sostenido unos segundos. Aléjate de los monitores, ponte de pie y sigue el conteo.',
        startLabel: 'Comenzar la bitácora',
        activeLabelPrefix: 'Registro',
        doneMessage: 'Bitácora completa. Manos y cuello descansan — el oído vuelve afinado a la estática.'
      },
      rule: {
        body: 'Cada <strong style="color:#EFE3CE;">20 minutos</strong> frente a los monitores CRT, dirige la vista a un punto a <strong style="color:#EFE3CE;">20 pies</strong> (unos 6 m) durante <strong style="color:#EFE3CE;">20 segundos</strong>. Relaja el enfoque antes de que el ojo confunda el ruido de fondo con señal.'
      },
      rest: {
        buttonLabel: '⟡ Archivar la sesión y descansar',
        statusSome: function (n, hh) { return 'Has archivado la sesión ' + n + (n === 1 ? ' vez' : ' veces') + '. Tus registros están a salvo' + (hh ? ' · última pausa ' + hh : '') + '.'; },
        statusNone: 'Tus registros ya están a salvo. Vuelve cuando lo necesites.'
      }
    },
    comerciante: {
      kicker: 'Física Computacional · El Archivo de Transmisiones',
      title: 'El Archivista de Señales',
      quote: '«Todo lo que se ha escuchado, se conserva aquí. Cada instrumento que te lleves aligera la carga de seguir escuchando lo que siempre estuvo transmitiendo.»',
      currencyLabel: 'fragmentos de señal',
      wares: [
        { id: 'colemak', glyph: '\u2328', costo: 60, cat: 'Instrumento · Prioridad', name: 'La Disposición de Baja Interferencia', real: 'Cambiar de QWERTY a Colemak-DH', tip: 'QWERTY se diseñó para máquinas mecánicas ajenas a la mano que hoy interpreta la señal. Esta disposición mantiene las letras frecuentes bajo los dedos que menos se desplazan: menos ruido en la escucha, la misma atención al espectro.' },
        { id: 'split', glyph: '\u2453', costo: 55, cat: 'Hardware · Ergonómico', name: 'El Panel de Recepción Bipartito', real: 'Teclado split / columnar', tip: 'Un panel dividido permite que los hombros se abran, sin forzar las muñecas contra el borde de la consola. La postura deja de generar su propia interferencia.' },
        { id: 'modal', glyph: '\u2756', costo: 45, cat: 'Técnica · Eficiencia', name: 'El Método de Registro Directo', real: 'Vim / movimiento por teclado', tip: 'Cada vez que la mano abandona el teclado para alcanzar el dial, se pierde el hilo de la transmisión. Anotar sin soltar la escucha mantiene la atención fija en la señal.' },
        { id: 'tiling', glyph: '\u25f0', costo: 40, cat: 'Método · Organización', name: 'El Archivador de Frecuencias Ordenado', real: 'Tiling WM / atajos de ventanas', tip: 'Ordenar las pantallas por comando, no amontonándolas, ahorra cientos de búsquedas por sesión. Menos ruido visual, más claridad para distinguir la señal del silencio.' },
        { id: 'reposa', glyph: '\u2334', costo: 25, cat: 'Hardware · Soporte', name: 'El Soporte de Muñeca del Observador', real: 'Soporte de muñeca neutro', tip: 'La muñeca debe reposar recta frente al panel, no doblarse contra el borde de la consola. Un soporte que mantenga el ángulo neutro evita comprimir el nervio — el origen de más de una falla de transcripción.' },
        { id: 'pie', glyph: '\u2191', costo: 50, cat: 'Hardware · Postural', name: 'La Consola de Pie', real: 'Escritorio de pie / alternar postura', tip: 'Ningún observador escucha bien clavado en la misma silla por horas. Alternar entre sentarse y trabajar de pie cada media hora reactiva la circulación y despeja la espalda para la próxima escucha.' },
        { id: 'flux', glyph: '\u263E', costo: 20, cat: 'Software · Nocturno', name: 'El Filtro de Fósforo Cálido', real: 'Filtro de luz cálida (f.lux / Night Shift)', tip: 'Al avanzar la noche, el fósforo frío de los monitores CRT ahuyenta el sueño. Un filtro que entibie los tonos protege el descanso — y un buen descanso agudiza el oído para la próxima transmisión.' },
        { id: 'pomodoro', glyph: '\u25d4', costo: 15, cat: 'Instrumento · Temporal', name: 'El Reloj de Sesión', real: 'Técnica Pomodoro (25 + 5)', tip: '25 minutos de escucha activa, 5 de pausa. El límite no te aparta de la señal: te protege de las sesiones interminables que arruinan muñecas, ojos y concentración. Cada pausa es una breve salida de la sala de escucha.' }
      ]
    }
  },

  ats: {
    hoguera: {
      title: 'La Sala del Generador',
      heroSubtitle: 'Suelta las herramientas un momento. El generador sostiene el refugio mientras descansas: nada de lo reparado se pierde.',
      breath: {
        sectionTitle: 'Regula la presión',
        kicker: function (cycle) { return 'Ciclo de purga · 4·4·4·4 · ciclo ' + cycle; },
        intro: 'Sigue el indicador: sube al inhalar, se sostiene, baja al exhalar. Cuatro ciclos estabilizan la presión antes de volver a la reparación.',
        startLabel: 'Iniciar la purga'
      },
      stretch: {
        sectionTitle: 'Mantenimiento del cuerpo',
        kickerActive: function (i, total) { return 'Rutina de mantenimiento · pieza ' + i + ' / ' + total; },
        kickerIdle: function (total) { return 'Rutina de mantenimiento · ' + total + ' piezas'; },
        kickerDone: 'Rutina de mantenimiento · completa',
        intro: 'Seis rutinas breves de mantenimiento corporal, cada una sostenida unos segundos. Suelta la llave inglesa, ponte de pie y sigue el conteo.',
        startLabel: 'Iniciar mantenimiento',
        activeLabelPrefix: 'Pieza',
        doneMessage: 'Mantenimiento completo. Manos y cuello vuelven a funcionar sin fricción — el refugio agradece un cuerpo que no falla.'
      },
      rule: {
        body: 'Cada <strong style="color:#EFE3CE;">20 minutos</strong> de soldadura o pantalla, dirige la vista a un punto a <strong style="color:#EFE3CE;">20 pies</strong> (unos 6 m) durante <strong style="color:#EFE3CE;">20 segundos</strong>. Relaja el enfoque antes de que la vista se oxide como todo lo demás aquí abajo.'
      },
      rest: {
        buttonLabel: '⟡ Estabilizar el generador y descansar',
        statusSome: function (n, hh) { return 'Has estabilizado el generador ' + n + (n === 1 ? ' vez' : ' veces') + '. El refugio sigue en pie' + (hh ? ' · última pausa ' + hh : '') + '.'; },
        statusNone: 'El refugio ya está estable. Vuelve cuando lo necesites.'
      }
    },
    comerciante: {
      kicker: 'Física Computacional · El Depósito de Repuestos',
      title: 'El Chatarrero',
      quote: '«Nada se tira aquí abajo, todo se reutiliza. Cada pieza que instalas en tu cuerpo es una reparación menos que el refugio tendrá que hacer por ti.»',
      currencyLabel: 'componentes',
      wares: [
        { id: 'colemak', glyph: '\u2328', costo: 60, cat: 'Esquema · Prioridad', name: 'El Esquema de Disposición Reforzado', real: 'Cambiar de QWERTY a Colemak-DH', tip: 'QWERTY se diseñó para máquinas de antes del colapso, no para manos que ya cargan suficiente desgaste. Este esquema reubica los comandos frecuentes bajo los dedos que menos se mueven: menos piezas que reemplazar.' },
        { id: 'split', glyph: '\u2453', costo: 55, cat: 'Hardware · Ergonómico', name: 'El Panel de Control Partido', real: 'Teclado split / columnar', tip: 'Un panel dividido, soldado de dos piezas de chatarra, permite que los hombros se abran sin forzar las muñecas contra el metal. La postura deja de pelear contra la estructura.' },
        { id: 'modal', glyph: '\u2756', costo: 45, cat: 'Método · Eficiencia', name: 'El Protocolo de Reparación Directa', real: 'Vim / movimiento por teclado', tip: 'Cada vez que la mano suelta la herramienta para alcanzar otra al otro lado del banco, se pierde tiempo y foco. Trabajar sin abandonar la posición base mantiene las manos quietas y la reparación avanzando.' },
        { id: 'tiling', glyph: '\u25f0', costo: 40, cat: 'Método · Organización', name: 'El Tablero de Turnos Ordenado', real: 'Tiling WM / atajos de ventanas', tip: 'Ordenar las tareas por prioridad, no amontonándolas en el banco, ahorra horas de búsqueda entre chatarra. Menos desorden, más piezas reparadas por turno.' },
        { id: 'reposa', glyph: '\u2334', costo: 25, cat: 'Hardware · Soporte', name: 'El Soporte de Muñeca Improvisado', real: 'Soporte de muñeca neutro', tip: 'La muñeca debe apoyarse recta sobre el banco, no doblarse contra el borde oxidado. Un soporte que mantenga el ángulo neutro evita comprimir el nervio — una lesión que aquí abajo nadie puede permitirse.' },
        { id: 'pie', glyph: '\u2191', costo: 50, cat: 'Hardware · Postural', name: 'El Banco de Altura Ajustable', real: 'Escritorio de pie / alternar postura', tip: 'Nadie repara bien clavado en el mismo taburete por horas. Alternar entre sentarse y trabajar de pie cada media hora reactiva la circulación y descarga la espalda para el siguiente turno.' },
        { id: 'flux', glyph: '\u263E', costo: 20, cat: 'Software · Nocturno', name: 'El Filtro de Luz de Generador', real: 'Filtro de luz cálida (f.lux / Night Shift)', tip: 'La luz blanca y fría de los paneles de control confunde al cuerpo sobre cuándo es de noche allá arriba. Un filtro que entibie los tonos protege el descanso — y un buen descanso rinde más que otro café recalentado.' },
        { id: 'pomodoro', glyph: '\u25d4', costo: 15, cat: 'Método · Temporal', name: 'El Cronómetro de Turno de Reparación', real: 'Técnica Pomodoro (25 + 5)', tip: '25 minutos de reparación activa, 5 de descanso. El límite no te frena: te protege de los turnos interminables que arruinan muñecas, ojos y concentración. Cada pausa es una breve visita a la sala del generador.' }
      ]
    }
  }
};
