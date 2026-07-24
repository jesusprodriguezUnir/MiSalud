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
}

export interface Ingesta {
  hora: string;
  items: Item[];
}

/** Claves de las cinco ingestas del día, en orden de consumo. */
export type IngestaKey = 'desayuno' | 'tentempie' | 'comida' | 'merienda' | 'cena';

export interface DiaDieta {
  dia: string;
  entrenoFuerte?: boolean;
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

/** Type guard para el `@switch` de la plantilla. */
export function tieneReceta(item: Item): item is ItemReceta {
  return (item as ItemReceta).receta !== undefined;
}
