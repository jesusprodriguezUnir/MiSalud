import { Injectable } from '@angular/core';
import type { DiaDieta, DiaEntreno, IngestaKey, Plan } from '../domain/plan.types';

const NOMBRE_INGESTA: Record<IngestaKey, string> = {
  desayuno: 'Desayuno',
  tentempie: 'Tentempié',
  comida: 'Comida',
  merienda: 'Merienda',
  cena: 'Cena',
};

const HORAS_DEFECTO: Record<IngestaKey, string> = {
  desayuno: '08:30',
  tentempie: '11:00',
  comida: '14:00',
  merienda: '17:30',
  cena: '20:00',
};

@Injectable({ providedIn: 'root' })
export class ExportService {
  /** Inicia el diálogo nativo de impresión del navegador (guardar como PDF). */
  exportarPdf(): void {
    window.print();
  }

  /** Descarga un archivo .ics con las ingestas y el entrenamiento del día especificado. */
  descargarIcsDia(fechaIso: string, dieta: DiaDieta, entreno?: DiaEntreno): void {
    const fecha = new Date(`${fechaIso}T00:00:00`);
    const vevents: string[] = [];

    // Ingestas del día
    for (const key of ['desayuno', 'tentempie', 'comida', 'merienda', 'cena'] as IngestaKey[]) {
      const ingesta = dieta.ingestas[key];
      if (!ingesta) continue;

      const horaStr = ingesta.hora || HORAS_DEFECTO[key];
      const [hh, mm] = horaStr.split(':').map((x) => parseInt(x, 10));

      const dtStart = this.formatFechaIcs(fecha, hh, mm);
      const dtEnd = this.formatFechaIcs(fecha, hh + (mm >= 30 ? 1 : 0), (mm + 30) % 60);

      const itemsText = ingesta.items
        .map((it) => {
          let line = `- ${it.n}`;
          if (it.c) line += ` (${it.c})`;
          if (it.nota) line += ` [${it.nota}]`;
          if (it.receta) {
            line += `\n  Ingredientes: ${it.receta.ing.join(', ')}`;
            line += `\n  Pasos: ${it.receta.pasos.join(' -> ')}`;
          }
          return line;
        })
        .join('\n');

      vevents.push(
        this.crearVevent({
          uid: `${fechaIso}-${key}@misalud`,
          summary: `🥗 ${NOMBRE_INGESTA[key]} - MiSalud`,
          description: itemsText,
          dtStart,
          dtEnd,
        }),
      );
    }

    // Entrenamiento del día
    if (entreno) {
      const dtStart = this.formatFechaIcs(fecha, 18, 30);
      const dtEnd = this.formatFechaIcs(fecha, 19, 15);

      const descBloques = entreno.bloques
        .map((b) => `${b.t}:\n${b.e.map((x) => ` - ${x}`).join('\n')}`)
        .join('\n\n');

      vevents.push(
        this.crearVevent({
          uid: `${fechaIso}-entreno@misalud`,
          summary: `🏋️ ${entreno.titulo} (${entreno.duracion})`,
          description: descBloques,
          dtStart,
          dtEnd,
        }),
      );
    }

    const contenidoIcs = this.construirVcalendar(vevents);
    this.descargarArchivo(`misalud-dieta-${fechaIso}.ics`, contenidoIcs);
  }

  /** Descarga un archivo .ics con el plan completo de los 7 días comenzando en fechaInicio. */
  descargarIcsPlan(plan: Plan, fechaInicioIso: string): void {
    const fechaBase = new Date(`${fechaInicioIso}T00:00:00`);
    const vevents: string[] = [];

    for (let i = 0; i < 7; i++) {
      const d = new Date(fechaBase);
      d.setDate(d.getDate() + i);
      const diaIso = d.toISOString().split('T')[0];

      const dieta = plan.dieta[i];
      const entreno = plan.entreno[i];

      if (dieta) {
        for (const key of ['desayuno', 'tentempie', 'comida', 'merienda', 'cena'] as IngestaKey[]) {
          const ingesta = dieta.ingestas[key];
          if (!ingesta) continue;

          const horaStr = ingesta.hora || HORAS_DEFECTO[key];
          const [hh, mm] = horaStr.split(':').map((x) => parseInt(x, 10));

          const dtStart = this.formatFechaIcs(d, hh, mm);
          const dtEnd = this.formatFechaIcs(d, hh + (mm >= 30 ? 1 : 0), (mm + 30) % 60);

          const itemsText = ingesta.items
            .map((it) => `- ${it.n}${it.c ? ` (${it.c})` : ''}`)
            .join('\n');

          vevents.push(
            this.crearVevent({
              uid: `${diaIso}-${key}@misalud`,
              summary: `🥗 ${NOMBRE_INGESTA[key]} (${dieta.dia}) - MiSalud`,
              description: itemsText,
              dtStart,
              dtEnd,
            }),
          );
        }
      }

      if (entreno) {
        const dtStart = this.formatFechaIcs(d, 18, 30);
        const dtEnd = this.formatFechaIcs(d, 19, 15);

        vevents.push(
          this.crearVevent({
            uid: `${diaIso}-entreno@misalud`,
            summary: `🏋️ ${entreno.titulo} (${dieta.dia})`,
            description: entreno.bloques.map((b) => `${b.t}: ${b.e.join(', ')}`).join('\n'),
            dtStart,
            dtEnd,
          }),
        );
      }
    }

    const contenidoIcs = this.construirVcalendar(vevents);
    this.descargarArchivo(`misalud-plan-semanal-${fechaInicioIso}.ics`, contenidoIcs);
  }

  private construirVcalendar(vevents: string[]): string {
    return [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//MiSalud//Plan Dietetico//ES',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      ...vevents,
      'END:VCALENDAR',
    ].join('\r\n');
  }

  private crearVevent(opts: {
    uid: string;
    summary: string;
    description: string;
    dtStart: string;
    dtEnd: string;
  }): string {
    const esc = (text: string) =>
      text.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');

    return [
      'BEGIN:VEVENT',
      `UID:${opts.uid}`,
      `DTSTAMP:${this.formatFechaIcs(new Date(), new Date().getHours(), new Date().getMinutes())}Z`,
      `DTSTART:${opts.dtStart}`,
      `DTEND:${opts.dtEnd}`,
      `SUMMARY:${esc(opts.summary)}`,
      `DESCRIPTION:${esc(opts.description)}`,
      'BEGIN:VALARM',
      'TRIGGER:-PT15M',
      'ACTION:DISPLAY',
      `DESCRIPTION:Recordatorio ${esc(opts.summary)}`,
      'END:VALARM',
      'END:VEVENT',
    ].join('\r\n');
  }

  private formatFechaIcs(d: Date, hh: number, mm: number): string {
    const yyyy = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const h = String(hh).padStart(2, '0');
    const min = String(mm).padStart(2, '0');
    return `${yyyy}${m}${day}T${h}${min}00`;
  }

  private descargarArchivo(nombre: string, contenido: string): void {
    const blob = new Blob([contenido], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nombre;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}
