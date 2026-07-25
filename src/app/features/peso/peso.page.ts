import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  computed,
  linkedSignal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AvisoService } from '../../core/aviso.service';
import { PesoService } from '../../core/peso.service';
import { PlanService } from '../../core/plan.service';
import { NavegacionService } from '../../core/navegacion.service';
import { num } from '../../domain/fecha.util';
import { imc } from '../../domain/peso.calc';
import { PesoChart } from './peso-chart';

interface FilaTabla {
  fecha: string;
  peso: number;
  delta: number | null;
}

@Component({
  selector: 'app-peso',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, PesoChart],
  templateUrl: './peso.page.html',
})
export class PesoPage {
  private readonly pesoSvc = inject(PesoService);
  private readonly planSvc = inject(PlanService);
  private readonly nav = inject(NavegacionService);
  private readonly avisos = inject(AvisoService);

  readonly num = num;
  readonly pesos = this.pesoSvc.pesos;
  readonly perfil = this.planSvc.perfil;
  readonly objetivos = computed(() => this.planSvc.plan().objetivos);

  readonly ultimo = this.pesoSvc.ultimo;
  readonly media7 = this.pesoSvc.media7;
  readonly delta = this.pesoSvc.delta;
  readonly falta = this.pesoSvc.falta;
  readonly ritmo = this.pesoSvc.ritmo;

  /** IMC del último peso con la altura del perfil (null si falta alguno). */
  readonly imc = computed(() => imc(this.ultimo()?.peso, this.perfil().alturaCm));

  // Formulario de alta. La fecha sigue al día seleccionado en la cabecera
  // (‹ ›) pero admite edición manual hasta el siguiente cambio de día.
  readonly fecha = linkedSignal(() => this.nav.fechaIso());
  pesoInput = '';
  readonly error = signal('');

  // Últimos 20 registros con su variación respecto al anterior.
  readonly filas = computed<FilaTabla[]>(() => {
    const rev = [...this.pesos()].reverse().slice(0, 20);
    return rev.map((p, i, arr) => {
      const sig = arr[i + 1];
      return { fecha: p.fecha, peso: p.peso, delta: sig ? p.peso - sig.peso : null };
    });
  });

  fmtDia(fecha: string): string {
    return new Date(fecha).toLocaleDateString('es-ES', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });
  }

  async guardar(): Promise<void> {
    const fecha = this.fecha();
    const v = parseFloat(String(this.pesoInput).replace(',', '.'));
    if (!fecha || !Number.isFinite(v) || v < 30 || v > 200) {
      this.error.set('Introduce una fecha y un peso válidos.');
      return;
    }
    this.error.set('');
    this.pesoInput = '';
    try {
      await this.pesoSvc.add(fecha, v);
    } catch (e) {
      this.error.set('No se ha podido guardar.');
      console.warn(e);
    }
  }

  async borrar(fecha: string): Promise<void> {
    if (!confirm('¿Borrar este registro?')) return;
    try {
      await this.pesoSvc.borrar(fecha);
    } catch (e) {
      console.warn(e);
      this.avisos.mostrar('No se ha podido borrar el registro.');
    }
  }
}
