// ---------------------------------------------------------------------------
// Plan dietético de Ana Isabel Rodríguez Castro (junio 2026)
// Transcripción fiel del PDF del dietista-nutricionista.
// Este objeto se usa como SEMILLA: en el primer arranque se escribe en
// Firestore (usuarios/{uid}/plan/actual) y a partir de ahí manda el documento
// remoto, para poder editarlo sin volver a desplegar.
// ---------------------------------------------------------------------------

export const PLAN_VERSION = 1;

const DESAYUNO_BASE = [
  { n: 'Agua', c: '500 g (2 vasos)' },
  { n: 'Café solo', c: '50 g (1 taza)' },
  { n: 'Aceite de oliva', c: '14 g (1 cucharada sopera)' },
  { n: 'Aguacate', c: '25 g (3 lonchas finas)' },
  { n: 'Pan integral de trigo', c: '50 g (1/5 de barra de 250 g)' }
];
const NARANJA = { n: 'Naranja', c: '170 g (1 unidad pequeña)' };
const AGUA_CENA = { n: 'Agua', c: '500 g (2 vasos)' };

const desayuno = (proteina) => ({
  hora: '08:30',
  items: [...DESAYUNO_BASE, proteina, NARANJA]
});

export const DIETA = [
  // ---------------------------------------------------------------- LUNES --
  {
    dia: 'Lunes',
    entrenoFuerte: true,
    ingestas: {
      desayuno: desayuno({ n: 'Pechuga de pavo (fiambre)', c: '35 g (3 lonchas)' }),
      tentempie: { hora: '11:00', items: [{ n: 'Plátano', c: '130 g (1 unidad pequeña)' }] },
      comida: {
        hora: '14:00',
        items: [
          {
            n: 'Ensalada de pasta integral veraniega',
            receta: {
              ing: [
                'Macarrones integrales: 40 g (1 vaso pequeño de 100 ml)',
                'Pimiento rojo: 20 g (2 rodajas)',
                'Tomate crudo: 45 g (3 rodajas)',
                'Atún enlatado en agua: 30 g (1/2 lata pequeña redonda)',
                'Cebolla o cebolleta: 30 g (1 trozo pequeño)',
                'Aceite de oliva: 5 g (1 cucharada de postre)',
                'Vinagre: 5 g (al gusto)',
                'Pimienta negra: 1 g (al gusto)'
              ],
              pasos: [
                'Cocer los macarrones integrales en abundante agua durante 10 minutos, escurrir y reservar.',
                'Lavar y trocear en pequeños dados la cebolla, el pimiento rojo y el tomate.',
                'Escurrir el atún y mezclar en un bol junto con las hortalizas troceadas y la pasta.',
                'Preparar una vinagreta con el aceite de oliva, la pimienta molida y el vinagre.',
                'Emplatar la ensalada y aliñar con la vinagreta.'
              ]
            }
          },
          { n: 'Sardinas en aceite', c: '69 g (1/2 lata)' },
          { n: 'Queso tipo Burgos con calcio', c: '75 g (1 tarrina)' },
          { n: 'Melón', c: '150 g (1 cortada fina)' }
        ]
      },
      merienda: {
        hora: '17:30',
        items: [
          { n: 'Yogur bio cremoso', c: '125 g (1 unidad)' },
          { n: 'Arándanos', c: '25 g (10 unidades)' }
        ]
      },
      cena: {
        hora: '20:00',
        items: [
          AGUA_CENA,
          {
            n: 'Huevos escalfados sobre alcachofas y setas en salsa de ajo y perejil',
            receta: {
              ing: [
                'Huevo de gallina: 60 g (1 unidad talla M)',
                'Champiñón o seta: 100 g (5 unidades medianas)',
                'Aceite de oliva: 10 g (1 cucharada sopera)',
                'Alcachofa: 130 g (1 unidad mediana)',
                'Ajo: 5 g (1 diente)',
                'Perejil: 5 g (al gusto)'
              ],
              pasos: [
                'Limpiar las alcachofas eliminando el tallo, las hojas externas y las puntas dejando limpio el corazón. Escaldar los corazones en agua hirviendo durante 3 minutos. Sacar, escurrir y laminar.',
                'Preparar un majado con aceite, ajo y perejil picado.',
                'Saltear las setas laminadas; cuando empiecen a dorarse añadir las alcachofas y rehogar el conjunto. Cuando estén cocinadas, pintar con el majado de ajo y perejil.',
                'Cascar el huevo en una taza y reservar. Poner al fuego una olla con abundante agua y un chorro de vinagre. Cuando el agua esté a punto de hervir, hacer un remolino con una cuchara.',
                'Dejar caer el huevo en el centro del remolino y cocinar 3 minutos. Retirar con espumadera: la clara queda sólida y la yema líquida.',
                'Emplatar el salteado de verduras y colocar encima el huevo escalfado.'
              ]
            }
          },
          { n: 'Almendra sin cáscara', c: '15 g (10 almendras)' }
        ]
      }
    }
  },
  // --------------------------------------------------------------- MARTES --
  {
    dia: 'Martes',
    ingestas: {
      desayuno: desayuno({ n: 'Queso cottage', c: '40 g (2 cucharadas soperas)' }),
      tentempie: {
        hora: '11:00',
        items: [
          { n: 'Avellana sin cáscara', c: '20 g (10 unidades)' },
          { n: 'Kéfir bebible', c: '100 g (1 unidad pequeña)' }
        ]
      },
      comida: {
        hora: '14:00',
        items: [
          {
            n: 'Judías verdes con jamón',
            receta: {
              ing: [
                'Judía verde: 200 g (1 plato mediano)',
                'Jamón serrano: 40 g (4 lonchas)',
                'Cebolla o cebolleta: 50 g (1/3 de cebolleta)',
                'Aceite de oliva: 5 g (1 cucharada de postre)'
              ],
              pasos: [
                'Lavar las judías verdes, eliminar los extremos y trocear.',
                'Poner a cocer en agua hirviendo con sal durante 20 minutos.',
                'Saltear en una sartén caliente con el aceite la cebolla picada fina; cuando empiece a dorarse añadir el jamón en dados y rehogar 1 minuto.',
                'Añadir las judías verdes escurridas y saltear el conjunto para que se integren los sabores.'
              ]
            }
          },
          {
            n: 'Rodaballo a la plancha',
            receta: {
              ing: [
                'Rodaballo: 180 g',
                'Aceite de oliva: 10 g (1 cucharada sopera)',
                'Perejil: 2 g (al gusto)',
                'Sal común: 0,5 g'
              ],
              pasos: [
                'Pedir en la pescadería que limpien el rodaballo en filetes para asar a la plancha.',
                'Calentar la sartén, rociar con el aceite de oliva virgen extra y colocar el pescado con el lado sin piel boca abajo para que no se pegue. Dorar y dar la vuelta.',
                'Sazonar y, si se desea, espolvorear con perejil fresco picado.'
              ],
              nota: 'El rodaballo es un pescado blanco con muy poca grasa (3,6 g por 100 g de porción comestible).'
            }
          },
          { n: 'Ciruela', c: '75 g (1 unidad mediana)' }
        ]
      },
      cena: {
        hora: '20:00',
        items: [
          AGUA_CENA,
          { n: 'Yogur bio cremoso', c: '125 g (1 unidad)' },
          { n: 'Fresa o fresón', c: '60 g (3 unidades)' },
          { n: 'Almendra sin cáscara', c: '30 g (20 almendras)', nota: 'El plan lo lista como dos raciones de 15 g' }
        ]
      }
    }
  },
  // ------------------------------------------------------------- MIÉRCOLES --
  {
    dia: 'Miércoles',
    entrenoFuerte: true,
    ingestas: {
      desayuno: desayuno({ n: 'Pechuga de pavo (fiambre)', c: '35 g (3 lonchas)' }),
      tentempie: { hora: '11:00', items: [{ n: 'Plátano', c: '130 g (1 unidad pequeña)' }] },
      comida: {
        hora: '14:00',
        items: [
          {
            n: 'Ensalada de patata con huevo duro y atún',
            receta: {
              ing: [
                'Patata: 100 g (1 unidad pequeña)',
                'Cebolla o cebolleta: 30 g (1 trozo pequeño)',
                'Huevo de gallina: 55 g (1 unidad talla M)',
                'Atún en aceite: 40 g',
                'Pimiento rojo: 50 g',
                'Aceite de oliva: 5 g (1 cucharada de postre)',
                'Vinagre: 5 g (al gusto)'
              ],
              pasos: [
                'Cocer la patata troceada en agua hirviendo durante 20 minutos.',
                'Picar la cebolla y el pimiento rojo en dados pequeños.',
                'Poner a cocer el huevo en agua hirviendo durante 10 minutos.',
                'Mezclar en una fuente la patata escurrida con las hortalizas, el huevo cocido picado y el atún escurrido y desmenuzado.',
                'Aliñar la ensalada con aceite y vinagre.'
              ]
            }
          },
          { n: 'Queso tipo Burgos con calcio', c: '40 g (1/2 tarrina)' },
          { n: 'Melón', c: '150 g (1 cortada fina)' }
        ]
      },
      merienda: {
        hora: '17:30',
        items: [
          { n: 'Yogur bio cremoso', c: '125 g (1 unidad)' },
          { n: 'Arándanos', c: '25 g (10 unidades)' }
        ]
      },
      cena: {
        hora: '20:00',
        items: [
          AGUA_CENA,
          {
            n: 'Ensalada de rúcula, tomate y cebolla',
            receta: {
              ing: [
                'Rúcula: 40 g',
                'Tomate crudo: 150 g (1 tomate pequeño tipo raf)',
                'Cebolla o cebolleta: 50 g (1/3 de cebolleta)',
                'Aceite de oliva: 8 g (1 cucharada de postre)'
              ],
              pasos: [
                'Lavar y trocear el tomate. Pelar la cebolla y cortar en juliana.',
                'Emplatar la rúcula en la base y colocar encima los trozos de tomate mezclados con la cebolla. Aliñar con aceite de oliva.'
              ]
            }
          },
          { n: 'Sardinas en aceite', c: '85 g (1 lata)' },
          { n: 'Almendra sin cáscara', c: '15 g (10 almendras)' }
        ]
      }
    }
  },
  // --------------------------------------------------------------- JUEVES --
  {
    dia: 'Jueves',
    ingestas: {
      desayuno: desayuno({ n: 'Queso cottage', c: '20 g (1 cucharada sopera)' }),
      tentempie: {
        hora: '11:00',
        items: [
          { n: 'Avellana sin cáscara', c: '20 g (10 unidades)' },
          { n: 'Kéfir bebible', c: '100 g (1 unidad pequeña)' }
        ]
      },
      comida: {
        hora: '14:00',
        items: [
          {
            n: 'Ensalada de garbanzos veraniega',
            receta: {
              ing: [
                'Garbanzos cocidos: 150 g',
                'Tomate crudo: 75 g (4 rodajas)',
                'Pepino: 75 g',
                'Atún en aceite: 55 g (1 lata pequeña redonda)',
                'Aceituna verde: 16 g',
                'Vinagre de Módena: 20 g (al gusto)',
                'Aceite de oliva: 5 g (1 cucharada de postre)'
              ],
              pasos: [
                'Lavar los garbanzos bajo un chorro de agua fría.',
                'Escurrir y dejar secar los garbanzos. Ponerlos en un bol o plato hondo.',
                'Lavar el tomate y el pepino.',
                'Cortar el tomate en dados pequeños.',
                'Pelar el pepino y trocear en trozos similares al tomate.',
                'Añadir el tomate, el pepino y las aceitunas al bol con los garbanzos.',
                'Desmigar el atún e incorporar al resto de ingredientes.',
                'Verter el aceite de oliva y el vinagre.',
                'Remover bien para que el aliño impregne homogéneamente todos los ingredientes.',
                'Servir directamente o dejar unos minutos en la nevera para comer en frío.'
              ]
            }
          },
          { n: 'Queso tipo Burgos con calcio', c: '40 g (1/2 tarrina)' },
          { n: 'Cereza', c: '75 g (8 unidades)' }
        ]
      },
      cena: {
        hora: '20:00',
        items: [
          AGUA_CENA,
          { n: 'Yogur bio cremoso', c: '125 g (1 unidad)' },
          { n: 'Fresa o fresón', c: '60 g (3 unidades)' },
          { n: 'Almendra sin cáscara', c: '15 g (10 almendras)' }
        ]
      }
    }
  },
  // -------------------------------------------------------------- VIERNES --
  {
    dia: 'Viernes',
    ingestas: {
      desayuno: desayuno({ n: 'Pechuga de pavo (fiambre)', c: '35 g (3 lonchas)' }),
      tentempie: {
        hora: '11:00',
        items: [
          { n: 'Avellana sin cáscara', c: '20 g (10 unidades)' },
          { n: 'Kéfir bebible', c: '100 g (1 unidad pequeña)' }
        ]
      },
      comida: {
        hora: '14:00',
        items: [
          {
            n: 'Coliflor con patatas',
            receta: {
              ing: [
                'Coliflor: 150 g (1 plato grande)',
                'Patata: 100 g (1 unidad pequeña)',
                'Aceite de oliva: 5 g (1 cucharada de postre)',
                'Sal común: 1 g'
              ],
              pasos: [
                'Limpiar y trocear la coliflor (vale la congelada ya lavada y troceada). Incorporar a agua hirviendo con sal a puñados, añadiendo poco a poco a medida que rompe de nuevo a hervir.',
                'Pelar, lavar y cascar en trozos no muy grandes la patata e incorporar al agua de cocción tras el último puñado de coliflor.',
                'Pasados 20-30 minutos, sacar y escurrir.',
                'Emplatar y añadir el aceite de oliva crudo por encima.'
              ],
              nota: 'Se puede dar un calentón al aceite en una sartén con unas láminas de ajo, retirar del fuego y añadir una cucharada de postre de pimentón dulce antes de servir.'
            }
          },
          {
            n: 'Pollo asado en su jugo',
            receta: {
              ing: [
                'Pollo, muslo/contramuslo: 170 g',
                'Aceite de oliva: 8 g (1 cucharada de postre)',
                'Ajo: 5 g (1 diente)',
                'Laurel: 4 g (al gusto)',
                'Vino de Jerez: 50 g'
              ],
              pasos: [
                'En una fuente de horno colocar el muslo de pollo sin piel. Agregar el aceite de oliva, el laurel y los ajos enteros y regar con el vino. Se pueden añadir otras especias o hierbas aromáticas al gusto.',
                'Hornear a 190 ºC; a los 20 minutos dar la vuelta y regar con la mezcla del vino y el jugo desprendido.',
                'Pasados 20 minutos más, volver a dar la vuelta y asar 15 minutos.',
                'Emplatar el muslo y aliñar generosamente con el jugo del fondo de la fuente.'
              ]
            }
          },
          { n: 'Melón', c: '150 g (1 cortada fina)' }
        ]
      },
      cena: {
        hora: '20:00',
        items: [
          AGUA_CENA,
          {
            n: 'Parrillada de calabacín y tomate',
            receta: {
              ing: [
                'Calabacín: 100 g (1 calabacín pequeño)',
                'Tomate crudo: 90 g (1 tomate pequeño tipo pera)',
                'Aceite de oliva: 5 g (1 cucharada de postre)'
              ],
              pasos: [
                'Cortar el calabacín y el tomate en rodajas.',
                'Añadir a la parrilla la cantidad indicada de aceite y asar a fuego vivo las hortalizas.'
              ]
            }
          },
          {
            n: 'Tosta integral de guacamole con salmón ahumado y huevo poché',
            receta: {
              ing: [
                'Pan integral de trigo: 40 g (1/5 de barra de 250 g)',
                'Guacamole: 20 g',
                'Salmón ahumado: 20 g (1 loncha fina)',
                'Huevo de gallina: 60 g (1 unidad talla M)'
              ],
              pasos: [
                'Cascar el huevo en una taza y reservar.',
                'Poner al fuego una olla con abundante agua y un chorro de vinagre. Cuando esté a punto de hervir, hacer un remolino con una cuchara.',
                'Dejar caer el huevo en el centro del remolino y cocinar 3 minutos.',
                'Retirar con espumadera: la clara queda sólida y la yema líquida.',
                'Untar la rebanada de pan con el guacamole, colocar encima el salmón ahumado y por último el huevo poché.'
              ]
            }
          },
          { n: 'Almendra sin cáscara', c: '15 g (10 almendras)' }
        ]
      }
    }
  },
  // --------------------------------------------------------------- SÁBADO --
  {
    dia: 'Sábado',
    ingestas: {
      desayuno: desayuno({ n: 'Queso cottage', c: '20 g (1 cucharada sopera)' }),
      comida: {
        hora: '14:00',
        items: [
          { n: 'Agua Vichy Catalán (con gas)', c: '100 g' },
          { n: 'Berberechos al natural', c: '65 g (1 lata ovalada)' },
          {
            n: 'Ensalada de espinacas, tomates cherry y sésamo con sepia a la plancha',
            receta: {
              ing: [
                'Sepia: 250 g (1/2 sepia de 500 g)',
                'Espinaca: 50 g',
                'Tomate crudo: 75 g (4 rodajas)',
                'Aceite de oliva: 8 g (1 cucharada de postre)',
                'Vinagre de Módena: 5 g (al gusto)',
                'Semillas de sésamo blancas: 5 g (1 cucharada de postre)'
              ],
              pasos: [
                'Asar en la plancha caliente la sepia entera y limpia.',
                'Preparar la ensalada mezclando los brotes de espinacas con los tomates cherry. Aliñar con aceite de oliva y vinagre de Módena.',
                'Emplatar la ensalada y colocar al lado la sepia asada. Espolvorear con semillas de sésamo.'
              ]
            }
          },
          { n: 'Pan integral de trigo', c: '35 g (1 rebanada de 3 dedos de grosor)' },
          { n: 'Ciruela', c: '75 g (1 unidad mediana)' }
        ]
      },
      cena: {
        hora: '20:00',
        items: [
          AGUA_CENA,
          { n: 'Yogur bio cremoso', c: '125 g (1 unidad)' },
          { n: 'Frambuesa', c: '45 g (15 unidades)' },
          { n: 'Avellana sin cáscara', c: '20 g (10 unidades)' }
        ]
      }
    }
  },
  // -------------------------------------------------------------- DOMINGO --
  {
    dia: 'Domingo',
    ingestas: {
      desayuno: desayuno({ n: 'Jamón ibérico', c: '15 g (1 loncha)' }),
      comida: {
        hora: '14:00',
        items: [
          { n: 'Agua Vichy Catalán (con gas)', c: '100 g' },
          {
            n: 'Guisantes con jamón',
            receta: {
              ing: [
                'Guisante fresco: 80 g (5 vainas de guisante)',
                'Jamón serrano: 45 g (5 lonchas)',
                'Cebolla blanca: 75 g (1 unidad pequeña)',
                'Aceite de oliva: 5 g (1 cucharada de postre)'
              ],
              pasos: [
                'Cocer los guisantes en agua hirviendo durante 20 minutos. Escurrir y reservar.',
                'Pochar en una sartén con el aceite sugerido la cebolla troceada; cuando empiece a dorarse añadir el jamón en dados y rehogar todo junto.',
                'Añadir al salteado los guisantes reservados y mezclar durante unos minutos.'
              ]
            }
          },
          {
            n: 'Tortilla de cebolla y bacalao ahumado',
            receta: {
              ing: [
                'Huevo de gallina: 60 g (1 unidad talla M)',
                'Clara de huevo pasteurizada: 70 g (2 unidades)',
                'Bacalao ahumado: 40 g (2 lonchas pequeñas)',
                'Cebolla o cebolleta: 50 g (1/3 de cebolleta)',
                'Aceite de oliva: 8 g (1 cucharada de postre)'
              ],
              pasos: [
                'Poner a pochar con el aceite sugerido la cebolla cortada en dados pequeños.',
                'Cuando la cebolla empiece a dorarse, añadir el bacalao ahumado desmenuzado. Rehogar el conjunto.',
                'Batir el huevo junto con la clara y verter en la sartén sobre el salteado.',
                'Cuajar la tortilla por ambos lados.'
              ]
            }
          },
          { n: 'Cereza', c: '75 g (8 unidades)' }
        ]
      },
      cena: {
        hora: '20:00',
        items: [
          AGUA_CENA,
          { n: 'Yogur bio cremoso', c: '125 g (1 unidad)' },
          { n: 'Frambuesa', c: '45 g (15 unidades)' },
          { n: 'Avellana sin cáscara', c: '20 g (10 unidades)' }
        ]
      }
    }
  }
];

// ---------------------------------------------------------------------------
// Entrenamiento
// Respeta el esquema que Ana ya hace (golf 1d, fuerza 2d, natación 1d,
// pilates 1d) y lo concreta. Condicionantes del informe que lo determinan:
//   - Osteopenia (cuello femoral T -2,0): prioridad a fuerza e impacto ligero.
//   - Mareos con fuerza de brazos por apnea: nunca aguantar la respiración,
//     nada por encima de la cabeza al inicio.
//   - Tendinitis reciente por pilates: regular carga en el hombro/muñeca.
//   - ERGE + hernia de hiato: sin crunches ni posturas invertidas, y entrenar
//     2-3 h después de comer, nunca en postprandial.
//   - Metabolismo basal bajo (1270 kcal): la fuerza es la palanca principal.
// ---------------------------------------------------------------------------

export const ENTRENO = [
  {
    dia: 'Lunes',
    titulo: 'Fuerza A · tren inferior y tirón',
    duracion: '35 min',
    tipo: 'fuerza',
    bloques: [
      { t: 'Calentamiento (5 min)', e: ['Gato-camello 8 repeticiones', 'Círculos de cadera 10 por lado', 'Banda elástica: aperturas de hombro 15 repeticiones'] },
      { t: 'Principal (25 min)', e: [
        'Sentadilla a banco (o goblet con mancuerna ligera) · 3 × 10-12',
        'Peso muerto rumano con mancuernas · 3 × 10',
        'Remo a un brazo con mancuerna o banda · 3 × 12 por lado',
        'Zancada estática con apoyo · 2 × 10 por pierna',
        'Puente de glúteo · 3 × 12',
        'Elevación de talones · 2 × 15'
      ] },
      { t: 'Vuelta a la calma (5 min)', e: ['Estiramiento de isquiotibiales, psoas y dorsal, 30 s cada uno'] }
    ],
    claves: [
      'Exhalar siempre al empujar o tirar. Si notas que aguantas el aire, baja el peso.',
      'Deja 2-3 repeticiones en recámara (esfuerzo 7/10). No se busca el fallo.',
      'Descanso de 60-90 s entre series.'
    ]
  },
  {
    dia: 'Martes',
    titulo: 'Pilates',
    duracion: '50 min',
    tipo: 'movilidad',
    bloques: [
      { t: 'Sesión dirigida', e: ['Avisa al instructor de la tendinitis y de la hernia de hiato.'] }
    ],
    claves: [
      'Evita ejercicios con carga sobre la muñeca/hombro doloridos: sustituye plancha alta por plancha en antebrazos.',
      'Evita inversiones y roll-over: empeoran el reflujo.',
      'Si aparece dolor de tendón (no molestia muscular), para ese ejercicio.'
    ]
  },
  {
    dia: 'Miércoles',
    titulo: 'Fuerza B · empuje y core',
    duracion: '35 min',
    tipo: 'fuerza',
    bloques: [
      { t: 'Calentamiento (5 min)', e: ['Movilidad de hombro con banda 10 repeticiones', 'Sentadilla sin carga 10 repeticiones', 'Rotaciones de columna dorsal 8 por lado'] },
      { t: 'Principal (25 min)', e: [
        'Press inclinado con mancuernas · 3 × 10',
        'Sentadilla búlgara con apoyo · 3 × 8 por pierna',
        'Jalón al pecho con banda elástica · 3 × 12',
        'Face pull con banda · 3 × 15',
        'Plancha frontal en antebrazos · 3 × 20-30 s',
        'Pallof press con banda · 2 × 10 por lado'
      ] },
      { t: 'Vuelta a la calma (5 min)', e: ['Estiramiento de pectoral en marco de puerta y de cuádriceps, 30 s cada uno'] }
    ],
    claves: [
      'Nada de press militar ni movimientos por encima de la cabeza hasta que desaparezcan los mareos.',
      'El core se trabaja en antiextensión y antirrotación: sin abdominales clásicos, que aumentan la presión intraabdominal.',
      'Sube el peso solo cuando completes todas las series en el rango alto con técnica limpia.'
    ]
  },
  {
    dia: 'Jueves',
    titulo: 'Natación',
    duracion: '45 min',
    tipo: 'cardio',
    bloques: [
      { t: 'Sesión', e: [
        '10 min de técnica suave',
        '8 × 50 m con 20 s de descanso (ritmo cómodo pero sostenido)',
        '10 min de nado continuo a ritmo bajo',
        '5 min de vuelta a la calma'
      ] }
    ],
    claves: [
      'Alterna estilos para no cargar el hombro con tendinitis.',
      'Deja pasar al menos 2 h desde la comida.'
    ]
  },
  {
    dia: 'Viernes',
    titulo: 'Caminata rápida + movilidad',
    duracion: '50 min',
    tipo: 'cardio',
    bloques: [
      { t: 'Caminata (40 min)', e: ['Ritmo vivo, capaz de hablar pero no de cantar. Busca alguna cuesta.'] },
      { t: 'Impacto óseo (opcional)', e: ['2 × 1 min de trote muy suave, solo si no hay molestias.'] },
      { t: 'Movilidad (10 min)', e: ['Apertura de cadera, movilidad dorsal y estiramiento de gemelo.'] }
    ],
    claves: [
      'El impacto ligero es uno de los pocos estímulos que frenan la osteopenia; introdúcelo poco a poco.'
    ]
  },
  {
    dia: 'Sábado',
    titulo: 'Golf',
    duracion: '4 h 30 min',
    tipo: 'cardio',
    bloques: [
      { t: 'Antes de salir (10 min)', e: ['Movilidad de cadera y columna dorsal, activación de glúteo.'] },
      { t: 'Vuelta', e: ['Camina el recorrido siempre que puedas: son varias horas de actividad de baja intensidad.'] }
    ],
    claves: [
      'Hidrátate durante el recorrido, sobre todo con el calor.',
      'Lleva el tentempié previsto para no llegar a la comida con hambre acumulada.'
    ]
  },
  {
    dia: 'Domingo',
    titulo: 'Caminata larga y estiramientos',
    duracion: '60 min',
    tipo: 'movilidad',
    bloques: [
      { t: 'Caminata (50 min)', e: ['Ritmo cómodo, en compañía si es posible.'] },
      { t: 'Estiramientos (10 min)', e: ['Cadena posterior completa, 30 s por posición, sin rebotes.'] }
    ],
    claves: ['Día de recuperación activa: la idea es moverse, no rendir.']
  }
];

export const HABITOS = [
  { t: 'Aceite de oliva virgen extra', d: 'Más de 3 cucharadas soperas al día repartidas entre las ingestas.' },
  { t: 'Agua', d: 'Alrededor de 2 L al día, sobre todo fuera de las comidas. El objetivo del informe era subir desde 1 L.' },
  { t: 'Agua con gas bicarbonatada', d: 'Tipo Vichy Catalán, para el reflujo. Evita bebidas azucaradas o con sodio (Aquarius).' },
  { t: 'Cena temprano', d: 'Cenar a las 20:00 y no tumbarse hasta 2-3 h después: es la medida que más ayuda con la hernia de hiato.' },
  { t: 'Romper el sedentarismo', d: 'Levantarse 3 minutos cada hora de trabajo de oficina.' },
  { t: 'Comidas de menor volumen', d: '5 ingestas al día. Comer despacio y masticar bien reduce la distensión abdominal.' },
  { t: 'Entrenar en postabsortivo', d: '2-3 h después de comer, nunca justo después de una ingesta.' }
];

export const OBJETIVOS = [
  { t: 'Peso', d: 'Bajar desde 66,5 kg (03/06/2026). Una pérdida del 8-10 % en 6 meses sitúa el objetivo en torno a 60 kg.' },
  { t: 'Grasa corporal', d: 'Por debajo del 28 % (partida: 37,4 %).' },
  { t: 'Grasa visceral', d: 'Por debajo de 100 cm² (partida: 114,3 cm²).' },
  { t: 'Metabolismo basal', d: 'Subirlo desde 1270 kcal con trabajo de fuerza.' },
  { t: 'Colesterol HDL', d: 'Aumentarlo (partida: 45 mg/dl, bajo).' },
  { t: 'Síntomas digestivos', d: 'Reducir pirosis, regurgitación y distensión abdominal.' }
];
