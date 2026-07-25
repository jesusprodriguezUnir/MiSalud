import { Component, ChangeDetectionStrategy, inject, effect, computed } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { TitleCasePipe } from '@angular/common';
import { AuthService } from '../core/auth.service';
import { PlanService } from '../core/plan.service';
import { PesoService } from '../core/peso.service';
import { DiaService } from '../core/dia.service';
import { NavegacionService } from '../core/navegacion.service';
import { ConectividadService } from '../core/conectividad.service';
import { ThemeService } from '../core/theme.service';
import { FechaLargaPipe } from '../shared/pipes/fecha-larga.pipe';

// Marco de la app autenticada: cabecera con navegación de día, banda de "Sin
// conexión", contenido enrutado y barra de pestañas inferior. Al montarse
// dispara la carga de plan/perfil, el stream de pesos y el estado del día.
@Component({
  selector: 'app-shell',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, TitleCasePipe, FechaLargaPipe],
  templateUrl: './shell.html',
  styleUrl: './shell.scss',
})
export class Shell {
  private readonly auth = inject(AuthService);
  private readonly planSvc = inject(PlanService);
  private readonly pesoSvc = inject(PesoService);
  private readonly diaSvc = inject(DiaService);
  readonly nav = inject(NavegacionService);
  readonly conectividad = inject(ConectividadService);
  readonly theme = inject(ThemeService);

  readonly diaSemana = computed(() =>
    this.nav.fecha().toLocaleDateString('es-ES', { weekday: 'long' }),
  );
  readonly temaLabel = computed(() =>
    this.theme.tema() === 'claro' ? 'Modo oscuro' : 'Modo claro',
  );

  constructor() {
    // Cuando hay usuario, arranca la carga de datos una sola vez.
    let arrancado = false;
    effect(() => {
      const u = this.auth.usuario();
      if (u && !arrancado) {
        arrancado = true;
        void this.arrancar();
      }
    });
  }

  private async arrancar(): Promise<void> {
    await this.planSvc.cargar();
    this.pesoSvc.escuchar();
    await this.diaSvc.cargar(this.nav.fechaIso());
  }

  logout(): void {
    this.pesoSvc.detener();
    void this.auth.logout();
  }
}
