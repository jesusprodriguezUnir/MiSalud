import { Injectable, inject, signal, computed, effect } from '@angular/core';
import { AuthService } from './auth.service';
import { DiaService } from './dia.service';
import { iso } from '../domain/fecha.util';

// Día actualmente mostrado, compartido entre las vistas Hoy y Semana.
//
// La precarga del estado del día vive aquí, en un effect sobre (usuario, fecha),
// y no en cada método de navegación: así el día visible siempre tiene su estado
// cargado venga de donde venga el cambio —flechas de la cabecera, salto desde
// Semana, o simplemente entrar en la app—, sin que ninguna vista tenga que
// acordarse de pedirlo. `DiaService.cargar` es idempotente (cachea por fecha),
// así que repetir la llamada no cuesta una lectura extra.
@Injectable({ providedIn: 'root' })
export class NavegacionService {
  private readonly auth = inject(AuthService);
  private readonly diaSvc = inject(DiaService);

  readonly fecha = signal(new Date());
  readonly fechaIso = computed(() => iso(this.fecha()));
  readonly esHoy = computed(() => this.fechaIso() === iso(new Date()));

  constructor() {
    effect(() => {
      const fecha = this.fechaIso();
      if (this.auth.usuario()) void this.diaSvc.cargar(fecha);
    });
  }

  mover(dias: number): void {
    const d = new Date(this.fecha());
    d.setDate(d.getDate() + dias);
    this.fecha.set(d);
  }

  /** Salta al índice de día (0 = lunes) dentro de la semana mostrada. */
  irADiaSemana(indiceObjetivo: number, indiceActual: number): void {
    const d = new Date(this.fecha());
    d.setDate(d.getDate() + (indiceObjetivo - indiceActual));
    this.fecha.set(d);
  }
}
