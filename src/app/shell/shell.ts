import {
  Component,
  ChangeDetectionStrategy,
  inject,
  effect,
  computed,
  signal,
} from '@angular/core';
import { Router, RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { TitleCasePipe } from '@angular/common';
import { AuthService } from '../core/auth.service';
import { PlanService } from '../core/plan.service';
import { PesoService } from '../core/peso.service';
import { DiaService } from '../core/dia.service';
import { NavegacionService } from '../core/navegacion.service';
import { ConectividadService } from '../core/conectividad.service';
import { ThemeService } from '../core/theme.service';
import { diaSemana } from '../domain/fecha.util';
import { FechaLargaPipe } from '../shared/pipes/fecha-larga.pipe';
import { AvisoToast } from './aviso-toast';

// Marco de la app autenticada: cabecera con navegación de día, banda de "Sin
// conexión", contenido enrutado y barra de pestañas inferior. Al montarse
// dispara la carga de plan/perfil, el stream de pesos y el estado del día.
@Component({
  selector: 'app-shell',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, TitleCasePipe, FechaLargaPipe, AvisoToast],
  templateUrl: './shell.html',
  styleUrl: './shell.scss',
})
export class Shell {
  private readonly auth = inject(AuthService);
  private readonly planSvc = inject(PlanService);
  private readonly pesoSvc = inject(PesoService);
  private readonly diaSvc = inject(DiaService);
  private readonly router = inject(Router);
  readonly nav = inject(NavegacionService);
  readonly conectividad = inject(ConectividadService);
  readonly theme = inject(ThemeService);

  readonly diaSemana = computed(() => diaSemana(this.nav.fecha()));
  readonly temaLabel = computed(() =>
    this.theme.tema() === 'claro' ? 'Modo oscuro' : 'Modo claro',
  );

  /** Error de carga del plan/perfil: mientras esté puesto no se pinta el outlet. */
  readonly error = this.planSvc.error;
  readonly reintentando = signal(false);

  /** Hasta que el plan remoto no ha respondido se muestra un esqueleto: los
   * signals contienen la semilla local y pintarla sería mentir. Lo mismo vale si
   * la carga ha fallado: en ese caso se pinta la pantalla de error. */
  readonly listo = computed(() => !this.planSvc.cargando() && !this.error());

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

  // El estado del día lo precarga NavegacionService con un effect sobre la
  // fecha visible, así que aquí solo quedan plan/perfil y el stream de pesos.
  private async arrancar(): Promise<void> {
    await this.planSvc.cargar();
    this.pesoSvc.escuchar();
  }

  async reintentar(): Promise<void> {
    if (this.reintentando()) return;
    this.reintentando.set(true);
    try {
      await this.planSvc.reintentar();
      this.pesoSvc.reconectar();
    } finally {
      this.reintentando.set(false);
    }
  }

  /**
   * Cierra la sesión: para los streams, **borra los datos de memoria** y navega
   * a /login. Sin el reset, los signals seguían conteniendo peso, plan y checks
   * del usuario; sin la navegación, el guard no llega a evaluarse (solo corre al
   * navegar) y la pantalla seguía mostrando esos datos de salud tras "Salir".
   */
  async logout(): Promise<void> {
    this.pesoSvc.reset();
    this.planSvc.reset();
    this.diaSvc.reset();
    await this.auth.logout();
    await this.router.navigate(['/login']);
  }
}
