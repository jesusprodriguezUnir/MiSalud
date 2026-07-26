import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { AvisoService } from '../core/aviso.service';

// Aviso efímero sobre la barra inferior. `aria-live="polite"` para que el
// lector de pantalla lo anuncie sin interrumpir lo que esté leyendo.
@Component({
  selector: 'app-aviso-toast',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="toast-zona" role="status" aria-live="polite">
      @if (avisos.aviso(); as a) {
        <div class="toast" [class.ok]="a.tipo === 'ok'">
          <span>{{ a.texto }}</span>
          @if (a.accion; as accion) {
            <button type="button" class="accion" (click)="avisos.ejecutarAccion()">
              {{ accion.etiqueta }}
            </button>
          }
          <button type="button" (click)="avisos.cerrar()" aria-label="Cerrar aviso">×</button>
        </div>
      }
    </div>
  `,
  styles: [
    `
      .toast-zona {
        position: fixed;
        left: 0;
        right: 0;
        bottom: calc(72px + env(safe-area-inset-bottom));
        z-index: 40;
        display: flex;
        justify-content: center;
        padding: 0 12px;
        pointer-events: none;
      }
      .toast {
        pointer-events: auto;
        display: flex;
        align-items: center;
        gap: 10px;
        max-width: 520px;
        background: var(--surface);
        color: var(--text);
        border: 2px solid var(--warn);
        border-radius: var(--radius);
        box-shadow: var(--shadow-md);
        padding: 10px 12px;
        font-size: 13px;
      }
      .toast.ok {
        border-color: var(--accent);
      }
      .toast button {
        background: none;
        border: 0;
        color: var(--muted);
        font-size: 18px;
        line-height: 1;
        min-width: 44px;
        min-height: 44px;
      }
      .toast .accion {
        color: var(--accent);
        font-size: 13px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.04em;
        white-space: nowrap;
      }
      @media (min-width: 960px) {
        .toast-zona {
          bottom: 24px;
        }
      }
    `,
  ],
})
export class AvisoToast {
  readonly avisos = inject(AvisoService);
}
