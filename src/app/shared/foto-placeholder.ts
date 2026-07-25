import { Component, ChangeDetectionStrategy, input } from '@angular/core';

// Marcador visual para los huecos de foto del diseño (plato de una receta,
// foto de cabecera en el panel de escritorio). La app no tiene función de
// subida de imágenes: es una caja estática, sin lógica.
@Component({
  selector: 'app-foto-placeholder',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="foto-placeholder" [class.hero]="variante() === 'hero'">
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x="3" y="5" width="18" height="14" />
        <circle cx="9" cy="10" r="1.5" />
        <path d="M21 15l-5-5-4 4-3-3-5 5" />
      </svg>
      <span>{{ texto() }}</span>
    </div>
  `,
})
export class FotoPlaceholder {
  readonly variante = input<'plato' | 'hero'>('plato');
  readonly texto = input('Foto no disponible');
}
