import { Component, ChangeDetectionStrategy, input, computed } from '@angular/core';
import { escalaChart, mediaMovil, ritmoSemanal } from '../../domain/peso.calc';
import { num } from '../../domain/fecha.util';
import type { Peso } from '../../domain/plan.types';

// Gráfica de evolución del peso: peso diario (línea tenue + puntos), media móvil
// de 7 días (línea gruesa) y línea de objetivo punteada. SVG declarativo sobre
// la geometría calculada en peso.calc.ts (equivalente al chartSVG original).
@Component({
  selector: 'app-peso-chart',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (esc(); as e) {
      <svg
        class="chart"
        role="img"
        [attr.aria-label]="resumen()"
        [attr.viewBox]="'0 0 ' + e.W + ' ' + e.H"
        preserveAspectRatio="none"
      >
        @for (t of e.ticks; track t.v) {
          <line
            [attr.x1]="e.P.l"
            [attr.x2]="e.W - e.P.r"
            [attr.y1]="t.y"
            [attr.y2]="t.y"
            stroke="var(--line)"
            stroke-width="1"
          />
          <text
            [attr.x]="e.P.l - 6"
            [attr.y]="t.y + 4"
            text-anchor="end"
            font-size="11"
            fill="var(--muted)"
          >
            {{ t.v.toFixed(1) }}
          </text>
        }
        <text [attr.x]="e.P.l" [attr.y]="e.H - 6" font-size="11" fill="var(--muted)">
          {{ fx(pesos()[0].fecha) }}
        </text>
        <text
          [attr.x]="e.W - e.P.r"
          [attr.y]="e.H - 6"
          font-size="11"
          fill="var(--muted)"
          text-anchor="end"
        >
          {{ fx(pesos()[pesos().length - 1].fecha) }}
        </text>
        @if (objetivoVisible()) {
          <line
            [attr.x1]="e.P.l"
            [attr.x2]="e.W - e.P.r"
            [attr.y1]="e.y(objetivo()!)"
            [attr.y2]="e.y(objetivo()!)"
            stroke="var(--warn)"
            stroke-width="1.5"
            stroke-dasharray="5 4"
          />
        }
        <path
          [attr.d]="lineaDiaria()"
          fill="none"
          stroke="var(--accent)"
          stroke-width="1.2"
          opacity="0.4"
        />
        @for (p of pesos(); track p.fecha) {
          <circle
            [attr.cx]="e.x(p.fecha)"
            [attr.cy]="e.y(p.peso)"
            r="2.6"
            fill="var(--accent)"
            opacity="0.45"
          />
        }
        <path
          [attr.d]="lineaMedia()"
          fill="none"
          stroke="var(--accent)"
          stroke-width="2.6"
          stroke-linejoin="round"
          stroke-linecap="round"
        />
      </svg>
      <p class="sr">{{ resumen() }}</p>
    } @else {
      <p class="empty">Registra al menos dos pesos para ver la tendencia.</p>
    }
  `,
})
export class PesoChart {
  readonly pesos = input.required<Peso[]>();
  readonly objetivo = input<number | undefined>(undefined);

  readonly esc = computed(() => escalaChart(this.pesos(), this.objetivo()));

  readonly objetivoVisible = computed(() => {
    const e = this.esc();
    const o = this.objetivo();
    return e && o !== undefined && o > e.min && o < e.max;
  });

  readonly lineaDiaria = computed(() => {
    const e = this.esc();
    if (!e) return '';
    return this.pesos()
      .map((p, i) => `${i ? 'L' : 'M'}${e.x(p.fecha).toFixed(1)},${e.y(p.peso).toFixed(1)}`)
      .join(' ');
  });

  readonly lineaMedia = computed(() => {
    const e = this.esc();
    if (!e) return '';
    return e.mm
      .map((p, i) => `${i ? 'L' : 'M'}${e.x(p.fecha).toFixed(1)},${e.y(p.peso).toFixed(1)}`)
      .join(' ');
  });

  /**
   * Equivalente textual de la gráfica: un SVG de líneas no dice nada a un lector
   * de pantalla, así que se resume lo que se ve —rango, extremos y ritmo—.
   */
  readonly resumen = computed(() => {
    const ps = this.pesos();
    if (ps.length < 2) return 'Gráfica de evolución del peso, sin datos suficientes.';

    const primero = ps[0];
    const ultimo = ps[ps.length - 1];
    const r = ritmoSemanal(mediaMovil(ps));
    const partes = [
      `Gráfica de evolución del peso del ${this.fx(primero.fecha)} al ${this.fx(ultimo.fecha)}`,
      `de ${num(primero.peso)} a ${num(ultimo.peso)} kilos`,
    ];

    if (r === null || Math.abs(r) < 0.05) partes.push('sin tendencia clara');
    else partes.push(`${r < 0 ? 'bajando' : 'subiendo'} ${num(Math.abs(r))} kilos por semana`);

    const o = this.objetivo();
    if (o !== undefined) partes.push(`objetivo ${num(o)} kilos`);

    return `${partes.join(', ')}.`;
  });

  fx(fecha: string): string {
    return new Date(fecha).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
  }
}
