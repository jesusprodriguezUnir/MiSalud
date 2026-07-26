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

/** Día de la semana en minúsculas y en español, p. ej. "miércoles". Estaba
 * duplicado en el shell y en la vista Hoy. */
export function diaSemana(d: Date): string {
  return d.toLocaleDateString('es-ES', { weekday: 'long' });
}

/** Milisegundos que faltan hasta la próxima medianoche local. */
export function msHastaMedianoche(ahora = new Date()): number {
  const manana = new Date(ahora);
  manana.setHours(24, 0, 0, 0);
  return manana.getTime() - ahora.getTime();
}

/** Fecha larga en español, p. ej. "3 de junio de 2026". */
export function fmtFecha(d: Date): string {
  return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
}

/** Fecha corta con día de la semana: "mié, 3 jun". */
export function fmtDiaCorto(fechaIso: string): string {
  return new Date(fechaIso).toLocaleDateString('es-ES', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

/** Redondeo a un decimal, como en la app original. */
export function num(v: number): number {
  return Math.round(v * 10) / 10;
}
