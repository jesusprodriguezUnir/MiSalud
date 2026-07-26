// ---------------------------------------------------------------------------
// Tipos del dominio. Describen exactamente la forma de los datos del plan
// (dieta y entrenamiento) transcritos en `plan.seed.ts`, más el perfil y el
// registro de peso persistidos en Firestore.
//
// El modelo de datos es idéntico al de la app vanilla original: no se cambia
// nada para que los documentos ya existentes en Firestore sigan siendo válidos.
// ---------------------------------------------------------------------------

/** Un ítem de comida con receta completa (ingredientes + elaboración). */
export interface ItemReceta {
  n: string;
  receta: Receta;
  c?: never;
  nota?: string;
}

/** Un ítem de comida simple: nombre y cantidad. */
export interface ItemSimple {
  n: string;
  c?: string;
  nota?: string;
  receta?: never;
}

/** Unión discriminada: un ítem tiene `receta` o no la tiene. */
export type Item = ItemReceta | ItemSimple;

export interface Receta {
  /** Ingredientes en formato "Nombre: 40 g (1 vaso)". */
  ing: string[];
  pasos: string[];
  nota?: string;
  fotoUrl?: string;
}

export interface Ingesta {
  hora: string;
  items: Item[];
}

/** Claves de las cinco ingestas del día, en orden de consumo. */
export type IngestaKey = 'desayuno' | 'tentempie' | 'comida' | 'merienda' | 'cena';

/** Las cinco ingestas en orden de consumo. Única fuente: la usan la vista Hoy
 * y el cálculo de la lista de la compra. */
export const ORDEN_INGESTAS: readonly IngestaKey[] = [
  'desayuno',
  'tentempie',
  'comida',
  'merienda',
  'cena',
] as const;

/** Etiqueta visible de cada ingesta. Única fuente: la usan Hoy, el editor de
 * Plan y la exportación a calendario, que antes tenían cada uno su copia. */
export const NOMBRE_INGESTA: Record<IngestaKey, string> = {
  desayuno: 'Desayuno',
  tentempie: 'Tentempié',
  comida: 'Comida',
  merienda: 'Merienda',
  cena: 'Cena',
};

/** Hora por defecto de cada ingesta: la que se asigna al crear una ingesta que
 * el día aún no tenía y la que usa el .ics cuando el plan no trae hora. Estaba
 * duplicada con dos valores distintos para la cena (20:00 vs 21:00). */
export const HORA_POR_DEFECTO: Record<IngestaKey, string> = {
  desayuno: '08:30',
  tentempie: '11:00',
  comida: '14:00',
  merienda: '17:30',
  cena: '21:00',
};

export interface DiaDieta {
  dia: string;
  entrenoFuerte?: boolean;
  /** Foto de cabecera del día. Se edita en Firestore, como el resto del plan;
   * si falta, la vista Hoy cae en la foto de la primera receta del día. */
  fotoUrl?: string;
  ingestas: Partial<Record<IngestaKey, Ingesta>>;
}

export interface BloqueEntreno {
  t: string;
  e: string[];
}

export type TipoEntreno = 'fuerza' | 'movilidad' | 'cardio';

export interface DiaEntreno {
  dia: string;
  titulo: string;
  duracion: string;
  tipo: TipoEntreno;
  bloques: BloqueEntreno[];
  claves?: string[];
}

export interface Habito {
  t: string;
  d: string;
}

export interface Objetivo {
  t: string;
  d: string;
}

/** Documento `usuarios/{uid}/perfil/datos`. */
export interface Perfil {
  nombre: string;
  alturaCm: number;
  pesoInicial: number;
  fechaInicio: string;
  objetivo: number;
}

/** Documento `usuarios/{uid}/plan/actual`. */
export interface Plan {
  version: number;
  actualizado?: string;
  dieta: DiaDieta[];
  entreno: DiaEntreno[];
  habitos: Habito[];
  objetivos: Objetivo[];
}

/** Documento `usuarios/{uid}/pesos/{YYYY-MM-DD}`. */
export interface Peso {
  fecha: string;
  peso: number;
  ts?: number;
}

/** Documento `usuarios/{uid}/dias/{YYYY-MM-DD}`. */
export interface EstadoDia {
  fecha?: string;
  hechas: Partial<Record<IngestaKey, boolean>>;
  entreno: boolean;
}

// -------------------------------------------------------------- validación ---
// Rangos admitidos para los datos numéricos que el usuario teclea. Estaban
// escritos a mano en cada pantalla y, para el peso, también en `firestore.rules`
// (que no puede importar de aquí: hay un comentario allí apuntando a estas
// constantes para que no se desfasen).

export const PESO_MIN = 30;
export const PESO_MAX = 200;
export const ALTURA_MIN = 100;
export const ALTURA_MAX = 250;

/** True si el peso está dentro del rango que aceptan la UI y las reglas. */
export function pesoValido(peso: number): boolean {
  return Number.isFinite(peso) && peso > PESO_MIN && peso < PESO_MAX;
}

/** Type guard para el `@switch` de la plantilla. */
export function tieneReceta(item: Item): item is ItemReceta {
  return (item as ItemReceta).receta !== undefined;
}
