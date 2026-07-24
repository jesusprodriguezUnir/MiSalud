import { Injectable, inject, signal, computed } from '@angular/core';
import { DiaService } from './dia.service';
import { iso } from '../domain/fecha.util';

// Día actualmente mostrado, compartido entre las vistas Hoy y Semana. Al mover
// el día se precarga su estado desde Firestore.
@Injectable({ providedIn: 'root' })
export class NavegacionService {
  private readonly diaSvc = inject(DiaService);

  readonly fecha = signal(new Date());
  readonly fechaIso = computed(() => iso(this.fecha()));
  readonly esHoy = computed(() => this.fechaIso() === iso(new Date()));

  async mover(dias: number): Promise<void> {
    const d = new Date(this.fecha());
    d.setDate(d.getDate() + dias);
    this.fecha.set(d);
    await this.diaSvc.cargar(iso(d));
  }

  /** Salta al índice de día (0 = lunes) dentro de la semana mostrada. */
  async irADiaSemana(indiceObjetivo: number, indiceActual: number): Promise<void> {
    const d = new Date(this.fecha());
    d.setDate(d.getDate() + (indiceObjetivo - indiceActual));
    this.fecha.set(d);
    await this.diaSvc.cargar(iso(d));
  }
}
