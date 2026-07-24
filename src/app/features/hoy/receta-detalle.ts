import { Component, ChangeDetectionStrategy, input } from '@angular/core';
import type { Receta } from '../../domain/plan.types';

// Receta plegable dentro de una tarjeta de ingesta.
@Component({
  selector: 'app-receta-detalle',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <details class="rec">
      <summary><span class="chev">›</span> Ver receta</summary>
      <div class="rec-body">
        <h4>Ingredientes (1 persona)</h4>
        <ul>
          @for (i of receta().ing; track i) {
            <li>{{ i }}</li>
          }
        </ul>
        <h4>Elaboración</h4>
        <ol>
          @for (p of receta().pasos; track p) {
            <li>{{ p }}</li>
          }
        </ol>
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
