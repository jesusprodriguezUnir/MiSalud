// Resolución de la foto de cabecera del día, pura y sin dependencia del DOM.
//
// Las fotos viven en Firestore, no en el código: el plan puede traer una foto
// propia del día (`dia.fotoUrl`) o, si no la tiene, se toma la del plato con
// receta más representativo. Se prioriza la comida y la cena porque son los
// platos elaborados del plan; el desayuno y las medias mañanas son alimentos
// sueltos y casi nunca llevan foto.

import type { DiaDieta, IngestaKey } from './plan.types';
import { tieneReceta } from './plan.types';

/** Ingestas de las que se puede sacar la foto del día, de más a menos principal. */
const PRIORIDAD: readonly IngestaKey[] = ['comida', 'cena', 'desayuno', 'merienda', 'tentempie'];

export interface FotoDia {
  url: string;
  /** Nombre del plato, para el texto alternativo. */
  titulo: string;
}

/** Foto de cabecera del día, o `null` si ni el día ni sus recetas tienen una. */
export function fotoDelDia(dia: DiaDieta | undefined): FotoDia | null {
  if (!dia) return null;

  for (const key of PRIORIDAD) {
    for (const item of dia.ingestas[key]?.items ?? []) {
      if (tieneReceta(item) && item.receta.fotoUrl) {
        // La foto propia del día manda, pero se aprovecha el nombre del plato.
        return { url: dia.fotoUrl ?? item.receta.fotoUrl, titulo: item.n };
      }
    }
  }

  return dia.fotoUrl ? { url: dia.fotoUrl, titulo: dia.dia } : null;
}
