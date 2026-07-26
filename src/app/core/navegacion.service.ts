import { Injectable, inject, signal, computed, effect, DestroyRef } from '@angular/core';
import { AuthService } from './auth.service';
import { DiaService } from './dia.service';
import { iso, msHastaMedianoche } from '../domain/fecha.util';

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

  /** "Hoy" real, recalculado al cruzar la medianoche y al volver a la pestaña. */
  private readonly hoyIso = signal(iso(new Date()));
  readonly esHoy = computed(() => this.fechaIso() === this.hoyIso());

  private temporizadorMedianoche: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    effect(() => {
      const fecha = this.fechaIso();
      if (this.auth.usuario()) void this.diaSvc.cargar(fecha);
    });

    // La app abierta a las 23:59 se quedaba mostrando "ayer" hasta recargar: la
    // fecha se fijaba una sola vez al construir el servicio. Se refresca al
    // cruzar la medianoche y también al volver a la pestaña, porque un móvil con
    // la pantalla apagada suspende los timers.
    this.programarMedianoche();
    const alVolver = () => {
      if (document.visibilityState === 'visible') this.refrescarHoy();
    };
    document.addEventListener('visibilitychange', alVolver);
    inject(DestroyRef).onDestroy(() => {
      document.removeEventListener('visibilitychange', alVolver);
      if (this.temporizadorMedianoche) clearTimeout(this.temporizadorMedianoche);
    });
  }

  private programarMedianoche(): void {
    if (this.temporizadorMedianoche) clearTimeout(this.temporizadorMedianoche);
    this.temporizadorMedianoche = setTimeout(() => {
      this.refrescarHoy();
      this.programarMedianoche();
    }, msHastaMedianoche() + 1000);
  }

  /** Si ha cambiado el día, arrastra la vista al nuevo hoy (si estaba en el anterior). */
  private refrescarHoy(): void {
    const nuevo = iso(new Date());
    if (nuevo === this.hoyIso()) return;
    const seguiaEnHoy = this.fechaIso() === this.hoyIso();
    this.hoyIso.set(nuevo);
    if (seguiaEnHoy) this.fecha.set(new Date());
  }

  mover(dias: number): void {
    const d = new Date(this.fecha());
    d.setDate(d.getDate() + dias);
    this.fecha.set(d);
  }

  /** Vuelve al día de hoy (botón "Hoy" de la cabecera). */
  irAHoy(): void {
    this.refrescarHoy();
    this.fecha.set(new Date());
  }

  /** Salta al índice de día (0 = lunes) dentro de la semana mostrada. */
  irADiaSemana(indiceObjetivo: number, indiceActual: number): void {
    const d = new Date(this.fecha());
    d.setDate(d.getDate() + (indiceObjetivo - indiceActual));
    this.fecha.set(d);
  }
}
