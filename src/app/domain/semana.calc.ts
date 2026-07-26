// ---------------------------------------------------------------------------
// Resúmenes de la vista Semana. Vivían dentro del componente pese a ser lógica
// pura del dominio (incluido el filtro de "Agua", que necesita un comentario más
// que un test para entenderse).
// ---------------------------------------------------------------------------

import { tieneReceta } from './plan.types';
import type { DiaDieta, EstadoDia, Item } from './plan.types';

/** El agua acompaña a todas las cenas del plan: como resumen no aporta nada. */
const IGNORADOS_EN_RESUMEN = new Set(['Agua']);

/**
 * Resumen de una ingesta: los platos con receta si los hay (son los que dan
 * nombre a la comida) y, si no, los primeros ítems sueltos.
 */
export function resumenItems(items: readonly Item[], maxSinReceta: number): string {
  const visibles = items.filter((x) => !IGNORADOS_EN_RESUMEN.has(x.n));
  const platos = visibles.filter(tieneReceta).map((x) => x.n);
  return platos.length
    ? platos.join(' · ')
    : visibles
        .slice(0, maxSinReceta)
        .map((x) => x.n)
        .join(' · ');
}

export function resumenComida(dia: DiaDieta): string {
  return resumenItems(dia.ingestas.comida?.items ?? [], 2);
}

export function resumenCena(dia: DiaDieta): string {
  return resumenItems(dia.ingestas.cena?.items ?? [], 3);
}

/** El título del entreno antes del primer separador " · ". */
export function tituloCorto(titulo: string): string {
  return titulo.split(' · ')[0];
}

export interface ProgresoDia {
  hechas: number;
  total: number;
  pct: number;
}

/**
 * Cumplimiento de un día: una casilla por ingesta del plan más una por el
 * entrenamiento, igual que el contador de la vista Hoy.
 */
export function progresoDia(dia: DiaDieta | undefined, estado: EstadoDia): ProgresoDia {
  const claves = dia ? (Object.keys(dia.ingestas) as (keyof typeof dia.ingestas)[]) : [];
  const total = claves.length + 1;
  const hechas = claves.filter((k) => estado.hechas[k]).length + (estado.entreno ? 1 : 0);
  return { hechas, total, pct: total ? Math.round((hechas / total) * 100) : 0 };
}
