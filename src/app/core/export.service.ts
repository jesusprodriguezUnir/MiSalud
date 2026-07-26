import { Injectable } from '@angular/core';
import { icsDia, icsPlan } from '../domain/ics.calc';
import type { DiaDieta, DiaEntreno, Plan } from '../domain/plan.types';

// Solo la parte impura de la exportación: la generación del .ics vive en
// `domain/ics.calc.ts`, que es pura y está cubierta por specs.
@Injectable({ providedIn: 'root' })
export class ExportService {
  /** Inicia el diálogo nativo de impresión del navegador (guardar como PDF). */
  exportarPdf(): void {
    window.print();
  }

  /** Descarga un archivo .ics con las ingestas y el entrenamiento del día especificado. */
  descargarIcsDia(fechaIso: string, dieta: DiaDieta, entreno?: DiaEntreno): void {
    this.descargarArchivo(`misalud-dieta-${fechaIso}.ics`, icsDia(fechaIso, dieta, entreno));
  }

  /** Descarga un archivo .ics con el plan completo de los 7 días desde fechaInicio. */
  descargarIcsPlan(plan: Plan, fechaInicioIso: string): void {
    this.descargarArchivo(
      `misalud-plan-semanal-${fechaInicioIso}.ics`,
      icsPlan(plan, fechaInicioIso),
    );
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
