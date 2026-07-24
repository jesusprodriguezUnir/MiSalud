// Utilidades de fecha puras, sin dependencia del DOM. Portadas literalmente de
// la app vanilla (legacy/public/js/app.js) para conservar el mismo comportamiento.

/** Fecha local a `YYYY-MM-DD` (no UTC: usa la zona horaria del navegador). */
export function iso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Índice del día con la semana empezando en lunes: 0 = lunes … 6 = domingo. */
export function idxDia(d: Date): number {
  return (d.getDay() + 6) % 7;
}

/** Fecha larga en español, p. ej. "3 de junio de 2026". */
export function fmtFecha(d: Date): string {
  return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
}

/** Redondeo a un decimal, como en la app original. */
export function num(v: number): number {
  return Math.round(v * 10) / 10;
}
