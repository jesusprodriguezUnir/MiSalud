import { Component, ChangeDetectionStrategy, inject, computed } from '@angular/core';
import { Router } from '@angular/router';
import { PlanService } from '../../core/plan.service';
import { DiaService } from '../../core/dia.service';
import { NavegacionService } from '../../core/navegacion.service';
import { ExportService } from '../../core/export.service';
import { idxDia, iso } from '../../domain/fecha.util';
import { progresoDia, resumenCena, resumenComida, tituloCorto } from '../../domain/semana.calc';
import type { ProgresoDia } from '../../domain/semana.calc';

interface FilaSemana {
  i: number;
  dia: string;
  tituloEntreno: string;
  esFuerza: boolean;
  comida: string;
  cena: string;
  progreso: ProgresoDia;
  esHoy: boolean;
  esSeleccionado: boolean;
}

// Resumen semanal: una tarjeta por día con comida y cena. Al pulsar salta al día
// correspondiente de la semana mostrada y navega a Hoy (igual que la app vanilla).
@Component({
  selector: 'app-semana',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './semana.page.html',
})
export class SemanaPage {
  private readonly planSvc = inject(PlanService);
  private readonly diaSvc = inject(DiaService);
  private readonly nav = inject(NavegacionService);
  private readonly router = inject(Router);
  private readonly exportSvc = inject(ExportService);

  /**
   * Una fila por día con todo lo que la plantilla necesita. El progreso sale de
   * `DiaService`, que solo tiene en caché los días ya visitados: para los demás
   * queda en 0/n, que es información honesta (no se va a red por siete días solo
   * para pintar una barrita).
   */
  readonly filas = computed<FilaSemana[]>(() => {
    const plan = this.planSvc.plan();
    const iActual = idxDia(this.nav.fecha());
    const hoyI = idxDia(new Date());

    return plan.dieta.map((d, i) => {
      const entreno = plan.entreno[i];
      return {
        i,
        dia: d.dia,
        tituloEntreno: tituloCorto(entreno?.titulo ?? ''),
        esFuerza: entreno?.tipo === 'fuerza',
        comida: resumenComida(d),
        cena: resumenCena(d),
        progreso: progresoDia(d, this.diaSvc.estado(this.isoDeDia(i, iActual))),
        esHoy: i === hoyI,
        esSeleccionado: i === iActual,
      };
    });
  });

  /** Fecha del día `i` de la semana que se está mirando. */
  private isoDeDia(i: number, iActual: number): string {
    const d = new Date(this.nav.fecha());
    d.setDate(d.getDate() + (i - iActual));
    return iso(d);
  }

  async ir(i: number): Promise<void> {
    this.nav.irADiaSemana(i, idxDia(this.nav.fecha()));
    await this.router.navigate(['/hoy']);
  }

  exportarPdf(): void {
    this.exportSvc.exportarPdf();
  }

  descargarIcsPlan(): void {
    this.exportSvc.descargarIcsPlan(this.planSvc.plan(), this.nav.fechaIso());
  }
}
