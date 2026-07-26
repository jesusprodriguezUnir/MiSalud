import { Component, ChangeDetectionStrategy, inject, computed } from '@angular/core';
import { PlanService } from '../../core/plan.service';
import { DiaService } from '../../core/dia.service';
import { NavegacionService } from '../../core/navegacion.service';
import { ExportService } from '../../core/export.service';
import { diaSemana, idxDia } from '../../domain/fecha.util';
import { fotoDelDia } from '../../domain/foto.calc';
import { NOMBRE_INGESTA, ORDEN_INGESTAS, tieneReceta } from '../../domain/plan.types';
import type { IngestaKey } from '../../domain/plan.types';
import { RouterLink } from '@angular/router';
import { RecetaDetalle } from './receta-detalle';
import { FotoPlaceholder } from '../../shared/foto-placeholder';
import { FechaLargaPipe } from '../../shared/pipes/fecha-larga.pipe';

@Component({
  selector: 'app-hoy',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, RecetaDetalle, FotoPlaceholder, FechaLargaPipe],
  templateUrl: './hoy.page.html',
})
export class HoyPage {
  private readonly planSvc = inject(PlanService);
  private readonly diaSvc = inject(DiaService);
  readonly nav = inject(NavegacionService);
  private readonly exportSvc = inject(ExportService);

  readonly tieneReceta = tieneReceta;
  readonly nombreIngesta = NOMBRE_INGESTA;

  private readonly i = computed(() => idxDia(this.nav.fecha()));
  readonly dia = computed(() => this.planSvc.plan().dieta[this.i()]);
  readonly entreno = computed(() => this.planSvc.plan().entreno[this.i()]);
  readonly habitos = computed(() => this.planSvc.plan().habitos);

  readonly estado = computed(() => this.diaSvc.estado(this.nav.fechaIso()));

  /** Foto de cabecera: la del día si el plan la trae, si no la del plato principal. */
  readonly foto = computed(() => fotoDelDia(this.dia()));

  readonly ingestas = computed(() => {
    const d = this.dia();
    return ORDEN_INGESTAS.filter((k) => d.ingestas[k]).map((k) => ({
      key: k,
      ingesta: d.ingestas[k]!,
    }));
  });
  readonly hechas = computed(
    () => this.ingestas().filter(({ key }) => this.estado().hechas[key]).length,
  );

  // Progreso del día: un segmento por ingesta más uno por el entrenamiento.
  readonly segmentos = computed<boolean[]>(() => {
    const est = this.estado();
    return [...this.ingestas().map(({ key }) => !!est.hechas[key]), est.entreno];
  });
  readonly total = computed(() => this.segmentos().length);
  readonly hechasTotal = computed(() => this.segmentos().filter(Boolean).length);
  readonly pct = computed(() => Math.round((this.hechasTotal() / this.total()) * 100));
  /** Todo lo del día marcado: dispara la micro-celebración de la cabecera. */
  readonly completo = computed(() => this.total() > 0 && this.hechasTotal() === this.total());

  readonly diaSemana = computed(() => diaSemana(this.nav.fecha()));

  toggleEntreno(): void {
    void this.diaSvc.toggleEntreno(this.nav.fechaIso());
  }
  toggleIngesta(key: IngestaKey): void {
    void this.diaSvc.toggleIngesta(this.nav.fechaIso(), key);
  }

  exportarPdf(): void {
    this.exportSvc.exportarPdf();
  }

  descargarIcs(): void {
    this.exportSvc.descargarIcsDia(this.nav.fechaIso(), this.dia(), this.entreno());
  }
}
