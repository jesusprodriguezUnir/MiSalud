import { Component, ChangeDetectionStrategy, inject, computed } from '@angular/core';
import { Router } from '@angular/router';
import { PlanService } from '../../core/plan.service';
import { NavegacionService } from '../../core/navegacion.service';
import { ExportService } from '../../core/export.service';
import { idxDia } from '../../domain/fecha.util';
import { tieneReceta } from '../../domain/plan.types';
import type { DiaDieta } from '../../domain/plan.types';

// Resumen semanal: una tarjeta por día con comida y cena. Al pulsar salta al día
// correspondiente de la semana mostrada y navega a Hoy (igual que la app vanilla).
@Component({
  selector: 'app-semana',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './semana.page.html',
})
export class SemanaPage {
  private readonly planSvc = inject(PlanService);
  private readonly nav = inject(NavegacionService);
  private readonly router = inject(Router);
  private readonly exportSvc = inject(ExportService);

  readonly hoyI = idxDia(new Date());
  readonly dieta = computed(() => this.planSvc.plan().dieta);
  readonly entreno = computed(() => this.planSvc.plan().entreno);

  tituloCorto(i: number): string {
    return this.entreno()[i].titulo.split(' · ')[0];
  }
  esFuerza(i: number): boolean {
    return this.entreno()[i].tipo === 'fuerza';
  }

  resumenComida(dia: DiaDieta): string {
    const items = dia.ingestas.comida?.items ?? [];
    const platos = items.filter(tieneReceta).map((x) => x.n);
    return platos.length
      ? platos.join(' · ')
      : items
          .map((x) => x.n)
          .slice(0, 2)
          .join(' · ');
  }
  resumenCena(dia: DiaDieta): string {
    const items = (dia.ingestas.cena?.items ?? []).filter((x) => x.n !== 'Agua');
    const platos = items.filter(tieneReceta).map((x) => x.n);
    return platos.length
      ? platos.join(' · ')
      : items
          .map((x) => x.n)
          .slice(0, 3)
          .join(' · ');
  }

  async ir(i: number): Promise<void> {
    await this.nav.irADiaSemana(i, idxDia(this.nav.fecha()));
    await this.router.navigate(['/hoy']);
  }

  exportarPdf(): void {
    this.exportSvc.exportarPdf();
  }

  descargarIcsPlan(): void {
    this.exportSvc.descargarIcsPlan(this.planSvc.plan(), this.nav.fechaIso());
  }
}
