import { Component, ChangeDetectionStrategy, inject, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AvisoService } from '../../core/aviso.service';
import { PlanService } from '../../core/plan.service';
import { ThemeService } from '../../core/theme.service';
import { imc } from '../../domain/peso.calc';
import { PesoService } from '../../core/peso.service';
import type { Perfil } from '../../domain/plan.types';

// Edición del perfil (nombre, altura, peso inicial, fecha de inicio y objetivo).
// Hasta ahora estos campos solo podían tocarse desde la consola de Firestore,
// y alimentan el IMC y todos los indicadores de la pantalla de peso.
@Component({
  selector: 'app-ajustes',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule],
  templateUrl: './ajustes.page.html',
})
export class AjustesPage {
  private readonly planSvc = inject(PlanService);
  private readonly pesoSvc = inject(PesoService);
  private readonly avisos = inject(AvisoService);
  readonly theme = inject(ThemeService);

  // Copia local editable: el signal del servicio no se toca hasta guardar, para
  // que salir sin guardar no deje el resto de la app con datos a medias.
  readonly form = signal<Perfil>({ ...this.planSvc.perfil() });
  readonly error = signal('');
  readonly guardando = signal(false);

  /** IMC con la altura que se está editando y el último peso registrado. */
  readonly imcActual = computed(() => imc(this.pesoSvc.ultimo()?.peso, this.form().alturaCm));

  readonly temaLabel = computed(() =>
    this.theme.tema() === 'claro' ? 'Modo oscuro' : 'Modo claro',
  );

  set<K extends keyof Perfil>(campo: K, valor: Perfil[K]): void {
    this.form.update((f) => ({ ...f, [campo]: valor }));
  }

  setNumero(campo: 'alturaCm' | 'pesoInicial' | 'objetivo', valor: string): void {
    this.set(campo, parseFloat(String(valor).replace(',', '.')));
  }

  async guardar(): Promise<void> {
    const f = this.form();
    if (!f.nombre.trim()) return this.error.set('Escribe un nombre.');
    if (!(f.alturaCm >= 100 && f.alturaCm <= 250))
      return this.error.set('La altura debe estar entre 100 y 250 cm.');
    if (!(f.pesoInicial >= 30 && f.pesoInicial <= 200))
      return this.error.set('El peso inicial debe estar entre 30 y 200 kg.');
    if (!(f.objetivo >= 30 && f.objetivo <= 200))
      return this.error.set('El objetivo debe estar entre 30 y 200 kg.');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(f.fechaInicio))
      return this.error.set('Indica la fecha de inicio.');

    this.error.set('');
    this.guardando.set(true);
    try {
      await this.planSvc.actualizarPerfil({ ...f, nombre: f.nombre.trim() });
      this.avisos.mostrar('Perfil guardado.', 'ok');
    } catch (e) {
      console.warn('perfil', e);
      this.error.set('No se ha podido guardar el perfil.');
    } finally {
      this.guardando.set(false);
    }
  }

  deshacer(): void {
    this.form.set({ ...this.planSvc.perfil() });
    this.error.set('');
  }
}
