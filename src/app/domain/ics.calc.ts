// ---------------------------------------------------------------------------
// Generación de calendarios iCalendar (RFC 5545) a partir del plan.
//
// Vivía dentro de `ExportService`, mezclada con `Blob` y `a.click()`, y por eso
// no tenía un solo test pese a ser ~180 líneas de lógica pura. Aquí recibe datos
// y devuelve una cadena; el servicio se queda solo con la descarga.
//
// Dos bugs que la versión anterior arrastraba y que los specs de al lado fijan:
//   · Los ids de los eventos del plan semanal se calculaban con
//     `toISOString().split('T')[0]` sobre una medianoche local, lo que en España
//     (UTC+1/+2) devuelve el día anterior. Se usa `iso()`, que es local.
//   · `DTSTAMP` llevaba una `Z` (= UTC) pegada a una hora construida con
//     componentes locales. O se emite en UTC de verdad, o no se pone la Z.
// ---------------------------------------------------------------------------

import { iso } from './fecha.util';
import { HORA_POR_DEFECTO, NOMBRE_INGESTA, ORDEN_INGESTAS } from './plan.types';
import type { DiaDieta, DiaEntreno, Ingesta, IngestaKey, Plan } from './plan.types';

/** Hora del entrenamiento en el .ics: el plan no la guarda. */
const HORA_ENTRENO = { hh: 18, mm: 30 };
const DURACION_ENTRENO_MIN = 45;
const DURACION_INGESTA_MIN = 30;

export interface Vevent {
  uid: string;
  summary: string;
  description: string;
  dtStart: string;
  dtEnd: string;
}

/** `Date` local + hora → `YYYYMMDDTHHMMSS` (hora local flotante, sin Z). */
export function fechaIcs(d: Date, hh: number, mm: number): string {
  const dos = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${dos(d.getMonth() + 1)}${dos(d.getDate())}T${dos(hh)}${dos(mm)}00`;
}

/** Instante en UTC → `YYYYMMDDTHHMMSSZ`, como exige DTSTAMP. */
export function fechaIcsUtc(d: Date): string {
  return `${d.toISOString().replace(/[-:]/g, '').split('.')[0]}Z`;
}

/** Escapado de TEXT según RFC 5545 §3.3.11. */
export function escapar(texto: string): string {
  return texto
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

/** `"HH:MM"` → componentes numéricos, cayendo en la hora por defecto si no es válida. */
function horaDe(ingesta: Ingesta, key: IngestaKey): { hh: number; mm: number } {
  const bruto = ingesta.hora?.trim() || HORA_POR_DEFECTO[key];
  const [h, m] = bruto.split(':').map((x) => parseInt(x, 10));
  if (!Number.isFinite(h) || !Number.isFinite(m)) {
    const [hd, md] = HORA_POR_DEFECTO[key].split(':').map((x) => parseInt(x, 10));
    return { hh: hd, mm: md };
  }
  return { hh: h, mm: m };
}

/** Suma minutos a una hora del día, sin desbordar al día siguiente. */
function sumarMinutos(hh: number, mm: number, minutos: number): { hh: number; mm: number } {
  const total = hh * 60 + mm + minutos;
  return { hh: Math.min(23, Math.floor(total / 60)), mm: total % 60 };
}

/** Texto de una ingesta: `detallado` incluye ingredientes y pasos de la receta. */
function describirIngesta(ingesta: Ingesta, detallado: boolean): string {
  return ingesta.items
    .map((it) => {
      let linea = `- ${it.n}`;
      if (it.c) linea += ` (${it.c})`;
      if (detallado && it.nota) linea += ` [${it.nota}]`;
      if (detallado && it.receta) {
        linea += `\n  Ingredientes: ${it.receta.ing.join(', ')}`;
        linea += `\n  Pasos: ${it.receta.pasos.join(' -> ')}`;
      }
      return linea;
    })
    .join('\n');
}

/**
 * Los VEVENT de las ingestas de un día. `sufijoTitulo` distingue el export del
 * día suelto del del plan semanal, que añade el nombre del día.
 */
export function veventsDieta(
  fecha: Date,
  dieta: DiaDieta,
  opts: { detallado: boolean; sufijoTitulo?: string } = { detallado: true },
): Vevent[] {
  const fechaIso = iso(fecha);
  const out: Vevent[] = [];

  for (const key of ORDEN_INGESTAS) {
    const ingesta = dieta.ingestas[key];
    if (!ingesta) continue;

    const { hh, mm } = horaDe(ingesta, key);
    const fin = sumarMinutos(hh, mm, DURACION_INGESTA_MIN);

    out.push({
      uid: `${fechaIso}-${key}@misalud`,
      summary: `🥗 ${NOMBRE_INGESTA[key]}${opts.sufijoTitulo ?? ''}`,
      description: describirIngesta(ingesta, opts.detallado),
      dtStart: fechaIcs(fecha, hh, mm),
      dtEnd: fechaIcs(fecha, fin.hh, fin.mm),
    });
  }

  return out;
}

/** El VEVENT del entrenamiento de un día. */
export function veventEntreno(
  fecha: Date,
  entreno: DiaEntreno,
  opts: { detallado: boolean } = { detallado: true },
): Vevent {
  const { hh, mm } = HORA_ENTRENO;
  const fin = sumarMinutos(hh, mm, DURACION_ENTRENO_MIN);

  return {
    uid: `${iso(fecha)}-entreno@misalud`,
    summary: `🏋️ ${entreno.titulo} (${entreno.duracion})`,
    description: opts.detallado
      ? entreno.bloques.map((b) => `${b.t}:\n${b.e.map((x) => ` - ${x}`).join('\n')}`).join('\n\n')
      : entreno.bloques.map((b) => `${b.t}: ${b.e.join(', ')}`).join('\n'),
    dtStart: fechaIcs(fecha, hh, mm),
    dtEnd: fechaIcs(fecha, fin.hh, fin.mm),
  };
}

/** Serializa un VEVENT con su alarma de 15 minutos antes. */
export function serializarVevent(ev: Vevent, ahora: Date): string {
  return [
    'BEGIN:VEVENT',
    `UID:${ev.uid}`,
    `DTSTAMP:${fechaIcsUtc(ahora)}`,
    `DTSTART:${ev.dtStart}`,
    `DTEND:${ev.dtEnd}`,
    `SUMMARY:${escapar(ev.summary)}`,
    `DESCRIPTION:${escapar(ev.description)}`,
    'BEGIN:VALARM',
    'TRIGGER:-PT15M',
    'ACTION:DISPLAY',
    `DESCRIPTION:Recordatorio ${escapar(ev.summary)}`,
    'END:VALARM',
    'END:VEVENT',
  ].join('\r\n');
}

/** Envuelve los eventos en un VCALENDAR completo. */
export function serializarCalendario(eventos: readonly Vevent[], ahora = new Date()): string {
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//MiSalud//Plan Dietetico//ES',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    ...eventos.map((ev) => serializarVevent(ev, ahora)),
    'END:VCALENDAR',
  ].join('\r\n');
}

/** Fecha `YYYY-MM-DD` → `Date` a medianoche **local** (no UTC). */
export function desdeIso(fechaIso: string): Date {
  return new Date(`${fechaIso}T00:00:00`);
}

/** .ics de un solo día: sus ingestas con receta completa y su entrenamiento. */
export function icsDia(
  fechaIso: string,
  dieta: DiaDieta,
  entreno?: DiaEntreno,
  ahora = new Date(),
): string {
  const fecha = desdeIso(fechaIso);
  const eventos = veventsDieta(fecha, dieta, { detallado: true, sufijoTitulo: ' - MiSalud' });
  if (entreno) eventos.push(veventEntreno(fecha, entreno, { detallado: true }));
  return serializarCalendario(eventos, ahora);
}

/** .ics de los siete días del plan a partir de `fechaInicioIso`. */
export function icsPlan(plan: Plan, fechaInicioIso: string, ahora = new Date()): string {
  const base = desdeIso(fechaInicioIso);
  const eventos: Vevent[] = [];

  for (let i = 0; i < 7; i++) {
    const d = new Date(base);
    d.setDate(d.getDate() + i);

    const dieta = plan.dieta[i];
    const entreno = plan.entreno[i];

    if (dieta) {
      eventos.push(
        ...veventsDieta(d, dieta, { detallado: false, sufijoTitulo: ` (${dieta.dia}) - MiSalud` }),
      );
    }
    if (entreno) {
      const ev = veventEntreno(d, entreno, { detallado: false });
      eventos.push({ ...ev, summary: `🏋️ ${entreno.titulo} (${dieta?.dia ?? entreno.dia})` });
    }
  }

  return serializarCalendario(eventos, ahora);
}
