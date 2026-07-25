// Cálculos de peso puros, sin dependencia del DOM ni de Firebase. Portados
// literalmente de legacy/public/js/app.js (mediaMovil, ritmo, chartSVG).

import type { Peso } from './plan.types';

const DIA_MS = 864e5; // milisegundos en un día

export interface PuntoMedia {
  fecha: string;
  peso: number;
}

/**
 * Media móvil por ventana de tiempo real: para cada punto, promedia todos los
 * registros anteriores o iguales cuya fecha caiga dentro de `ventana` días.
 * No es una media de los últimos N registros, sino de los últimos N días.
 */
export function mediaMovil(pesos: Peso[], ventana = 7): PuntoMedia[] {
  return pesos.map((p, i) => {
    const t = new Date(p.fecha).getTime();
    const win = pesos.filter(
      (q, j) => j <= i && t - new Date(q.fecha).getTime() < ventana * DIA_MS,
    );
    return { fecha: p.fecha, peso: win.reduce((a, b) => a + b.peso, 0) / win.length };
  });
}

/**
 * Ritmo semanal (kg/semana) sobre la media móvil de las últimas ~4 semanas.
 * Toma como referencia el punto más antiguo a ≥21 días del final; devuelve
 * `null` si no hay al menos 7 días de datos, como en la app original.
 */
export function ritmoSemanal(mm: PuntoMedia[]): number | null {
  if (mm.length <= 3) return null;
  const fin = mm[mm.length - 1];
  const ref =
    [...mm].reverse().find((p) => +new Date(fin.fecha) - +new Date(p.fecha) >= 21 * DIA_MS) ??
    mm[0];
  const dias = (+new Date(fin.fecha) - +new Date(ref.fecha)) / DIA_MS;
  if (dias < 7) return null;
  return ((fin.peso - ref.peso) / dias) * 7;
}

export type CategoriaImc = 'Bajo peso' | 'Normal' | 'Sobrepeso' | 'Obesidad';

export interface Imc {
  valor: number;
  categoria: CategoriaImc;
}

/**
 * Índice de masa corporal (kg/m²) con su categoría OMS. Devuelve `null` si
 * falta el peso o la altura no es plausible, para no pintar una cifra inventada
 * cuando el perfil todavía está a medio rellenar.
 */
export function imc(pesoKg: number | null | undefined, alturaCm: number | undefined): Imc | null {
  if (!pesoKg || !alturaCm || alturaCm < 100 || alturaCm > 250) return null;
  const m = alturaCm / 100;
  const valor = pesoKg / (m * m);
  if (!Number.isFinite(valor)) return null;
  return { valor, categoria: categoriaImc(valor) };
}

function categoriaImc(valor: number): CategoriaImc {
  if (valor < 18.5) return 'Bajo peso';
  if (valor < 25) return 'Normal';
  if (valor < 30) return 'Sobrepeso';
  return 'Obesidad';
}

export interface EscalaChart {
  W: number;
  H: number;
  P: { t: number; r: number; b: number; l: number };
  min: number;
  max: number;
  x: (fecha: string) => number;
  y: (peso: number) => number;
  mm: PuntoMedia[];
  ticks: { v: number; y: number }[];
}

/**
 * Geometría de la gráfica: escalas x/y, límites y ticks. Mismas constantes que
 * el `chartSVG()` original (padding del 15 % del rango, mínimo 0,4 kg). Devuelve
 * `null` si hay menos de dos registros.
 */
export function escalaChart(pesos: Peso[], objetivo?: number, ticks = 4): EscalaChart | null {
  if (pesos.length < 2) return null;
  const W = 700;
  const H = 230;
  const P = { t: 16, r: 14, b: 26, l: 38 };
  const mm = mediaMovil(pesos);
  const t0 = new Date(pesos[0].fecha).getTime();
  const t1 = new Date(pesos[pesos.length - 1].fecha).getTime();
  const spanT = Math.max(t1 - t0, DIA_MS);
  const vals = pesos.map((p) => p.peso).concat(objetivo ? [objetivo] : []);
  let min = Math.min(...vals);
  let max = Math.max(...vals);
  const pad = Math.max((max - min) * 0.15, 0.4);
  min -= pad;
  max += pad;
  const x = (fecha: string) => P.l + ((new Date(fecha).getTime() - t0) / spanT) * (W - P.l - P.r);
  const y = (peso: number) => P.t + (1 - (peso - min) / (max - min)) * (H - P.t - P.b);
  const ticksArr = Array.from({ length: ticks + 1 }, (_, i) => {
    const v = min + ((max - min) * i) / ticks;
    return { v, y: y(v) };
  });
  return { W, H, P, min, max, x, y, mm, ticks: ticksArr };
}
