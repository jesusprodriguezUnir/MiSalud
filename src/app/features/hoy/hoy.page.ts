import { Component, ChangeDetectionStrategy, inject, computed } from '@angular/core';
import { PlanService } from '../../core/plan.service';
import { DiaService } from '../../core/dia.service';
import { NavegacionService } from '../../core/navegacion.service';
import { idxDia } from '../../domain/fecha.util';
import { tieneReceta } from '../../domain/plan.types';
import type { IngestaKey } from '../../domain/plan.types';
import { RecetaDetalle } from './receta-detalle';

const ORDEN: IngestaKey[] = ['desayuno', 'tentempie', 'comida', 'merienda', 'cena'];
const NOMBRE_INGESTA: Record<IngestaKey, string> = {
  desayuno: 'Desayuno',
  tentempie: 'Tentempié',
  comida: 'Comida',
  merienda: 'Merienda',
  cena: 'Cena',
};

@Component({
  selector: 'app-hoy',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RecetaDetalle],
  templateUrl: './hoy.page.html',
})
export class HoyPage {
  private readonly planSvc = inject(PlanService);
  private readonly diaSvc = inject(DiaService);
  private readonly nav = inject(NavegacionService);

  readonly tieneReceta = tieneReceta;
  readonly nombreIngesta = NOMBRE_INGESTA;

  private readonly i = computed(() => idxDia(this.nav.fecha()));
  readonly dia = computed(() => this.planSvc.plan().dieta[this.i()]);
  readonly entreno = computed(() => this.planSvc.plan().entreno[this.i()]);
  readonly habitos = computed(() => this.planSvc.plan().habitos);

  readonly estado = computed(() => this.diaSvc.estado(this.nav.fechaIso()));

  readonly ingestas = computed(() => {
    const d = this.dia();
    return ORDEN.filter((k) => d.ingestas[k]).map((k) => ({ key: k, ingesta: d.ingestas[k]! }));
  });
  readonly hechas = computed(
    () => this.ingestas().filter(({ key }) => this.estado().hechas[key]).length,
  );

  toggleEntreno(): void {
    void this.diaSvc.toggleEntreno(this.nav.fechaIso());
  }
  toggleIngesta(key: IngestaKey): void {
    void this.diaSvc.toggleIngesta(this.nav.fechaIso(), key);
  }
}
