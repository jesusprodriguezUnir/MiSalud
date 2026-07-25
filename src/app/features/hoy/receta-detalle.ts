import { Component, ChangeDetectionStrategy, input } from '@angular/core';
import type { Receta } from '../../domain/plan.types';
import { FotoPlaceholder } from '../../shared/foto-placeholder';

// Receta plegable dentro de una tarjeta de ingesta.
@Component({
  selector: 'app-receta-detalle',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FotoPlaceholder],
  template: `
    <details class="rec">
      <summary>Ver receta</summary>
      <div class="rec-body">
        <app-foto-placeholder
          variante="plato"
          [fotoUrl]="receta().fotoUrl"
          [texto]="receta().fotoUrl ? receta().ing[0] : 'Foto del plato'"
        />
        <h4>Ingredientes (1 persona)</h4>
        @for (i of receta().ing; track i) {
          <div class="rec-ing">{{ i }}</div>
        }
        <h4>Elaboración</h4>
        @for (p of receta().pasos; track p; let idx = $index) {
          <div class="rec-paso">
            <span class="num">{{ idx + 1 }}</span>
            <span class="txt">{{ p }}</span>
          </div>
        }
        @if (receta().nota) {
          <div class="nota">{{ receta().nota }}</div>
        }
      </div>
    </details>
  `,
})
export class RecetaDetalle {
  readonly receta = input.required<Receta>();
}
