// Agregación de la lista de la compra pura, sin dependencia del DOM. Portada
// literalmente de legacy/public/js/app.js (vistaCompra + CATS + categoria).

import type { DiaDieta, IngestaKey } from './plan.types';
import { tieneReceta } from './plan.types';

const ORDEN: IngestaKey[] = ['desayuno', 'tentempie', 'comida', 'merienda', 'cena'];

const CATS: [RegExp, string][] = [
  [/naranja|plátano|melón|ciruela|cereza|fresa|frambuesa|arándano|aguacate/i, 'Fruta'],
  [
    /judía|tomate|pimiento|cebolla|patata|coliflor|calabacín|espinaca|rúcula|pepino|alcachofa|champiñón|seta|guisante|ajo|laurel|perejil|aceituna/i,
    'Verdura y hortaliza',
  ],
  [/sardina|atún|rodaballo|sepia|berberecho|salmón|bacalao/i, 'Pescado y conservas'],
  [/pavo|jamón|pollo/i, 'Carne y fiambre'],
  [/huevo|clara|yogur|kéfir|queso/i, 'Huevos y lácteos'],
  [/almendra|avellana|sésamo/i, 'Frutos secos y semillas'],
  [
    /pan|macarrón|macarrones|garbanzo|aceite|vinagre|guacamole|vino|café|vichy|pimienta/i,
    'Despensa',
  ],
];

const IGNORA = /^(agua|sal común)$/i;

export const ORDEN_CATEGORIAS = [
  'Fruta',
  'Verdura y hortaliza',
  'Pescado y conservas',
  'Carne y fiambre',
  'Huevos y lácteos',
  'Frutos secos y semillas',
  'Despensa',
  'Otros',
];

export function categoria(nombre: string): string {
  return (CATS.find(([re]) => re.test(nombre)) ?? [null, 'Otros'])[1] as string;
}

export interface ItemCompra {
  n: string;
  g: number;
  veces: number;
  aproximado: boolean;
}

export interface GrupoCompra {
  categoria: string;
  items: ItemCompra[];
}

/**
 * Suma gramajes de las raciones e ingredientes de receta para los días
 * seleccionados (0 = lunes … 6 = domingo). Ignora agua y sal, marca como
 * `aproximado` los ítems sin gramaje explícito y agrupa por categoría en el
 * orden fijo de `ORDEN_CATEGORIAS`.
 */
export function agregarCompra(dieta: DiaDieta[], diasSel: Set<number>): GrupoCompra[] {
  const acc = new Map<string, ItemCompra>();
  const suma = (nombre: string, cant?: string) => {
    const n = nombre.trim().replace(/\s+/g, ' ');
    if (IGNORA.test(n)) return;
    const m = /(\d+(?:[.,]\d+)?)\s*g\b/.exec(cant ?? '');
    const g = m ? parseFloat(m[1].replace(',', '.')) : 0;
    const clave = n.toLowerCase();
    const prev = acc.get(clave) ?? { n, g: 0, veces: 0, aproximado: false };
    prev.g += g;
    prev.veces += 1;
    if (!g) prev.aproximado = true;
    acc.set(clave, prev);
  };

  dieta.forEach((dia, i) => {
    if (!diasSel.has(i)) return;
    for (const k of ORDEN) {
      const ing = dia.ingestas[k];
      if (!ing) continue;
      for (const it of ing.items) {
        if (tieneReceta(it)) {
          it.receta.ing.forEach((s) => {
            const p = s.split(':');
            suma(p[0], p.slice(1).join(':'));
          });
        } else {
          suma(it.n, it.c);
        }
      }
    }
  });

  const porCat = new Map<string, ItemCompra[]>();
  for (const v of acc.values()) {
    const c = categoria(v.n);
    if (!porCat.has(c)) porCat.set(c, []);
    porCat.get(c)!.push(v);
  }

  return ORDEN_CATEGORIAS.filter((c) => porCat.has(c)).map((c) => ({
    categoria: c,
    items: porCat.get(c)!.sort((a, b) => a.n.localeCompare(b.n, 'es')),
  }));
}
