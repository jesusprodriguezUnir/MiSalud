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
import { PESO_MAX, PESO_MIN, pesoValido } from '../../domain/plan.types';
import { PesoChart } from './peso-chart';
import { DiaCortoPipe } from '../../shared/pipes/dia-corto.pipe';
import { fmtDiaCorto } from '../../domain/fecha.util';

interface FilaTabla {
  fecha: string;
  peso: number;
  delta: number | null;
}

@Component({
  selector: 'app-peso',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, PesoChart, DiaCortoPipe],
  templateUrl: './peso.page.html',
})
export class PesoPage {
  private readonly pesoSvc = inject(PesoService);
  private readonly planSvc = inject(PlanService);
  private readonly nav = inject(NavegacionService);
  private readonly avisos = inject(AvisoService);

  readonly num = num;
  readonly pesos = this.pesoSvc.pesos;
  readonly desconectado = this.pesoSvc.desconectado;
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
  /** True mientras hay un alta en vuelo: deshabilita el botón (anti doble tap). */
  readonly guardando = signal(false);

  readonly pesoMin = PESO_MIN;
  readonly pesoMax = PESO_MAX;

  // Últimos 20 registros con su variación respecto al anterior.
  readonly filas = computed<FilaTabla[]>(() => {
    const rev = [...this.pesos()].reverse().slice(0, 20);
    return rev.map((p, i, arr) => {
      const sig = arr[i + 1];
      return { fecha: p.fecha, peso: p.peso, delta: sig ? p.peso - sig.peso : null };
    });
  });

  private fmtDia(fecha: string): string {
    return fmtDiaCorto(fecha);
  }

  reconectar(): void {
    this.pesoSvc.reconectar();
  }

  async guardar(): Promise<void> {
    if (this.guardando()) return;
    const fecha = this.fecha();
    const v = parseFloat(this.pesoInput.replace(',', '.'));
    if (!fecha || !pesoValido(v)) {
      this.error.set(`Introduce una fecha y un peso entre ${PESO_MIN} y ${PESO_MAX} kg.`);
      return;
    }
    this.error.set('');
    this.guardando.set(true);
    try {
      await this.pesoSvc.add(fecha, v);
      // El input solo se vacía tras un alta que ha ido bien: si se limpiara
      // antes del await, un fallo de escritura se llevaría por delante lo que
      // el usuario acababa de teclear.
      this.pesoInput = '';
    } catch (e) {
      this.error.set('No se ha podido guardar. Revisa el dato e inténtalo de nuevo.');
      console.warn(e);
    } finally {
      this.guardando.set(false);
    }
  }

  /**
   * Borra el registro y ofrece deshacerlo durante unos segundos, en vez de
   * bloquear con el `confirm()` nativo antes de borrar.
   */
  async borrar(fecha: string): Promise<void> {
    const previo = this.pesos().find((p) => p.fecha === fecha);
    try {
      await this.pesoSvc.borrar(fecha);
    } catch (e) {
      console.warn(e);
      this.avisos.mostrar('No se ha podido borrar el registro.');
      return;
    }
    if (!previo) return;
    this.avisos.deshacer(`Registro del ${this.fmtDia(fecha)} borrado.`, () => {
      void this.pesoSvc.add(previo.fecha, previo.peso).catch((e: unknown) => {
        console.warn(e);
        this.avisos.mostrar('No se ha podido restaurar el registro.');
      });
    });
  }
}
