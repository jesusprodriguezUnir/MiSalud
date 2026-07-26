// ---------------------------------------------------------------------------
// Operaciones puras de edición del plan, usadas por la pantalla Plan.
//
// Toda la manipulación vive aquí y no en el componente por dos razones: es lo
// único del editor que se puede probar sin DOM (el resto es plantilla), y
// `limpiar()` es la barrera que evita escribir en Firestore un documento que el
// SDK rechazaría o que dejaría basura en el plan.
// ---------------------------------------------------------------------------

import { HORA_POR_DEFECTO } from './plan.types';
import type {
  DiaDieta,
  DiaEntreno,
  Habito,
  Ingesta,
  IngestaKey,
  Item,
  Objetivo,
  Plan,
  Receta,
} from './plan.types';

export const NOMBRE_DIA = [
  'Lunes',
  'Martes',
  'Miércoles',
  'Jueves',
  'Viernes',
  'Sábado',
  'Domingo',
] as const;

// ---------------------------------------------------------------- listas ---

/** Copia con el elemento `i` sustituido. */
export function reemplazar<T>(arr: readonly T[], i: number, v: T): T[] {
  const out = [...arr];
  out[i] = v;
  return out;
}

/** Copia sin el elemento `i`. */
export function quitar<T>(arr: readonly T[], i: number): T[] {
  return arr.filter((_, j) => j !== i);
}

/** Copia con el elemento `i` desplazado `delta` posiciones (sin salirse). */
export function mover<T>(arr: readonly T[], i: number, delta: number): T[] {
  const destino = i + delta;
  if (i < 0 || i >= arr.length || destino < 0 || destino >= arr.length) return [...arr];
  const out = [...arr];
  const [x] = out.splice(i, 1);
  out.splice(destino, 0, x);
  return out;
}

// -------------------------------------------------------------- texto <-> ---
// Ingredientes, pasos, ejercicios y claves se editan como texto multilínea (una
// entrada por línea): en un móvil es mucho más manejable que una pila de inputs.

export function aTexto(lineas: readonly string[] | undefined): string {
  return (lineas ?? []).join('\n');
}

/** Texto multilínea a lista, descartando líneas en blanco. */
export function aLineas(texto: string): string[] {
  return texto
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
}

// -------------------------------------------------------------- plantillas ---

export function itemVacio(): Item {
  return { n: '', c: '' };
}

export function recetaVacia(): Receta {
  return { ing: [], pasos: [] };
}

export function ingestaVacia(key: IngestaKey): Ingesta {
  return { hora: HORA_POR_DEFECTO[key], items: [itemVacio()] };
}

export function habitoVacio(): Habito {
  return { t: '', d: '' };
}

export function objetivoVacio(): Objetivo {
  return { t: '', d: '' };
}

export function diaEntrenoVacio(i: number): DiaEntreno {
  return {
    dia: NOMBRE_DIA[i] ?? 'Día',
    titulo: '',
    duracion: '',
    tipo: 'movilidad',
    bloques: [],
  };
}

export function diaDietaVacio(i: number): DiaDieta {
  return { dia: NOMBRE_DIA[i] ?? 'Día', ingestas: {} };
}

/**
 * Añade o quita la receta de un ítem. `Item` es una unión discriminada: un ítem
 * con receta no puede llevar cantidad y viceversa, así que al cambiar de forma
 * se descarta el campo que deja de ser válido en lugar de arrastrarlo.
 */
export function conReceta(item: Item, activar: boolean): Item {
  if (activar) {
    return { n: item.n, nota: item.nota, receta: item.receta ?? recetaVacia() };
  }
  return { n: item.n, nota: item.nota, c: item.c ?? '' };
}

// ---------------------------------------------------------------- limpieza ---

/** Cadena recortada, o `undefined` si queda vacía. */
function txt(v: string | undefined): string | undefined {
  const t = (v ?? '').trim();
  return t.length ? t : undefined;
}

/** Objeto sin las claves cuyo valor es `undefined`. Firestore rechaza `undefined`. */
function sinVacios<T extends object>(o: T): T {
  return Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as T;
}

function limpiarReceta(r: Receta): Receta {
  return sinVacios({
    ing: r.ing.map((x) => x.trim()).filter(Boolean),
    pasos: r.pasos.map((x) => x.trim()).filter(Boolean),
    nota: txt(r.nota),
    fotoUrl: txt(r.fotoUrl),
  });
}

function limpiarItem(it: Item): Item {
  const base = { n: it.n.trim(), nota: txt(it.nota) };
  return it.receta
    ? sinVacios({ ...base, receta: limpiarReceta(it.receta) })
    : sinVacios({ ...base, c: txt(it.c) });
}

function limpiarIngesta(ing: Ingesta): Ingesta {
  return {
    hora: ing.hora.trim(),
    // Un ítem sin nombre es una fila que se añadió y nunca se rellenó: no se
    // guarda, para no dejar líneas en blanco en la vista Hoy.
    items: ing.items.filter((it) => it.n.trim().length > 0).map(limpiarItem),
  };
}

function limpiarDiaDieta(d: DiaDieta): DiaDieta {
  const ingestas: Partial<Record<IngestaKey, Ingesta>> = {};
  for (const [k, ing] of Object.entries(d.ingestas) as [IngestaKey, Ingesta | undefined][]) {
    if (!ing) continue;
    const limpia = limpiarIngesta(ing);
    // Una ingesta a la que se le han borrado todos los ítems se descarta entera,
    // mismo criterio que con las filas sin rellenar: si se guardara, la vista Hoy
    // pintaría una sección vacía con su hora y nada debajo.
    if (limpia.items.length === 0) continue;
    ingestas[k] = limpia;
  }
  return sinVacios({
    dia: d.dia,
    entrenoFuerte: d.entrenoFuerte ? true : undefined,
    fotoUrl: txt(d.fotoUrl),
    ingestas,
  });
}

function limpiarDiaEntreno(d: DiaEntreno): DiaEntreno {
  return sinVacios({
    dia: d.dia,
    titulo: d.titulo.trim(),
    duracion: d.duracion.trim(),
    tipo: d.tipo,
    bloques: d.bloques
      .filter((b) => b.t.trim().length > 0 || b.e.length > 0)
      .map((b) => ({ t: b.t.trim(), e: b.e.map((x) => x.trim()).filter(Boolean) })),
    claves: d.claves?.length ? d.claves.map((x) => x.trim()).filter(Boolean) : undefined,
  });
}

function limpiarPar<T extends Habito | Objetivo>(x: T): T {
  return { ...x, t: x.t.trim(), d: x.d.trim() };
}

/**
 * Deja el plan listo para escribirse en Firestore: recorta cadenas, elimina las
 * claves `undefined` (el SDK lanza si se le pasa una) y descarta las filas que
 * el usuario añadió pero nunca rellenó.
 */
export function limpiar(plan: Plan): Plan {
  return {
    version: plan.version,
    ...(plan.actualizado ? { actualizado: plan.actualizado } : {}),
    dieta: plan.dieta.map(limpiarDiaDieta),
    entreno: plan.entreno.map(limpiarDiaEntreno),
    habitos: plan.habitos.filter((h) => h.t.trim() || h.d.trim()).map(limpiarPar),
    objetivos: plan.objetivos.filter((o) => o.t.trim() || o.d.trim()).map(limpiarPar),
  };
}

/** Copia profunda del plan para editarlo sin tocar el signal del servicio. */
export function clonar(plan: Plan): Plan {
  return structuredClone(plan);
}

/**
 * Normaliza un plan recién llegado de Firestore para que el editor pueda dar
 * por hechos los siete días de dieta y de entreno: un documento antiguo (o a
 * medio sembrar) podría traer menos, y el editor indexa por día de la semana.
 */
export function completar(plan: Plan): Plan {
  return {
    ...plan,
    dieta: NOMBRE_DIA.map((_, i) => plan.dieta[i] ?? diaDietaVacio(i)),
    entreno: NOMBRE_DIA.map((_, i) => plan.entreno[i] ?? diaEntrenoVacio(i)),
    habitos: plan.habitos ?? [],
    objetivos: plan.objetivos ?? [],
  };
}
