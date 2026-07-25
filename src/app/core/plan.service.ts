import { Injectable, inject, signal, DestroyRef } from '@angular/core';
import { Firestore, doc, setDoc, onSnapshot, Unsubscribe } from '@angular/fire/firestore';
import { AuthService } from './auth.service';
import { AvisoService } from './aviso.service';
import { PERFIL_DEFECTO } from '../../environments/environment';
import { DIETA, ENTRENO, HABITOS, OBJETIVOS, PLAN_VERSION } from '../domain/plan.seed';
import type { Perfil, Plan } from '../domain/plan.types';

// Carga, siembra y edición del plan y el perfil.
//
// Ambos documentos se siguen con `onSnapshot`, no con una lectura única: el plan
// ahora se edita desde la propia app (pantalla Plan), así que un cambio hecho en
// el móvil tiene que aparecer en el portátil sin recargar. Es el mismo modelo
// que ya usaba PesoService.
//
// La siembra solo ocurre cuando el documento NO existe *según el servidor*. Dos
// matices que importan:
//   · Nunca se siembra a partir de un snapshot que viene de la caché local
//     (`fromCache`): estando sin cobertura, un "no existe" de la caché haría que
//     `setDoc` pisara el plan real que sí hay en Firestore.
//   · Un plan existente con otra `version` se respeta tal cual. Antes se
//     resembraba, lo que hoy borraría todas las ediciones del usuario cada vez
//     que se tocara PLAN_VERSION en el código.
@Injectable({ providedIn: 'root' })
export class PlanService {
  private readonly db = inject(Firestore);
  private readonly auth = inject(AuthService);
  private readonly avisos = inject(AvisoService);

  /** True hasta que perfil y plan se han resuelto contra Firestore. Mientras
   * tanto los signals de abajo contienen la semilla local, que no debe pintarse
   * como si fuera el dato remoto. */
  readonly cargando = signal(true);

  /** True mientras hay una escritura del plan en vuelo (lo usa el editor). */
  readonly guardando = signal(false);

  readonly plan = signal<Plan>(this.semilla());
  readonly perfil = signal<Perfil>({ ...PERFIL_DEFECTO });

  private unsubPerfil: Unsubscribe | null = null;
  private unsubPlan: Unsubscribe | null = null;

  constructor() {
    inject(DestroyRef).onDestroy(() => this.detener());
  }

  private semilla(): Plan {
    return {
      version: PLAN_VERSION,
      dieta: DIETA,
      entreno: ENTRENO,
      habitos: HABITOS,
      objetivos: OBJETIVOS,
    };
  }

  private uid(): string {
    const uid = this.auth.uid;
    if (!uid) throw new Error('No hay sesión iniciada');
    return uid;
  }

  private refPerfil() {
    return doc(this.db, 'usuarios', this.uid(), 'perfil', 'datos');
  }
  private refPlan() {
    return doc(this.db, 'usuarios', this.uid(), 'plan', 'actual');
  }

  /**
   * Abre los streams de perfil y plan y resuelve con el primer snapshot de cada
   * uno (venga del servidor o de la caché), para que el shell pueda dejar de
   * pintar el esqueleto. Los streams siguen vivos después.
   */
  async cargar(): Promise<void> {
    this.cargando.set(true);
    try {
      await Promise.all([this.escucharPerfil(), this.escucharPlan()]);
    } finally {
      this.cargando.set(false);
    }
  }

  detener(): void {
    this.unsubPerfil?.();
    this.unsubPlan?.();
    this.unsubPerfil = null;
    this.unsubPlan = null;
  }

  private escucharPerfil(): Promise<void> {
    this.unsubPerfil?.();
    return new Promise<void>((resolver) => {
      let primero = true;
      const listo = () => {
        if (primero) {
          primero = false;
          resolver();
        }
      };
      this.unsubPerfil = onSnapshot(
        this.refPerfil(),
        (snap) => {
          if (snap.exists()) {
            this.perfil.set({ ...PERFIL_DEFECTO, ...(snap.data() as Partial<Perfil>) });
          } else if (!snap.metadata.fromCache) {
            void setDoc(this.refPerfil(), this.perfil()).catch((e) =>
              console.warn('sembrar perfil', e),
            );
          }
          listo();
        },
        (e) => {
          console.warn('perfil', e);
          this.avisos.mostrar('No se ha podido cargar tu perfil.');
          listo();
        },
      );
    });
  }

  private escucharPlan(): Promise<void> {
    this.unsubPlan?.();
    return new Promise<void>((resolver) => {
      let primero = true;
      const listo = () => {
        if (primero) {
          primero = false;
          resolver();
        }
      };
      this.unsubPlan = onSnapshot(
        this.refPlan(),
        (snap) => {
          const data = snap.data() as Plan | undefined;
          if (snap.exists() && data) {
            this.plan.set({
              version: data.version ?? PLAN_VERSION,
              actualizado: data.actualizado,
              dieta: data.dieta ?? [],
              entreno: data.entreno ?? [],
              habitos: data.habitos ?? [],
              objetivos: data.objetivos ?? [],
            });
          } else if (!snap.metadata.fromCache) {
            const semilla: Plan = { ...this.semilla(), actualizado: new Date().toISOString() };
            this.plan.set(semilla);
            void setDoc(this.refPlan(), semilla).catch((e) => console.warn('sembrar plan', e));
          }
          listo();
        },
        (e) => {
          console.warn('plan', e);
          this.avisos.mostrar('No se ha podido cargar el plan.');
          listo();
        },
      );
    });
  }

  /**
   * Guarda el perfil editado desde Ajustes. Escribe el documento entero (no un
   * merge) porque las reglas de Firestore validan que `perfil/datos` tenga
   * exactamente esas cinco claves. Lanza si falla, para que la pantalla pueda
   * mostrar el error sin dar por buena una edición que no se guardó.
   */
  async actualizarPerfil(datos: Perfil): Promise<void> {
    await setDoc(this.refPerfil(), datos);
    this.perfil.set(datos);
  }

  /**
   * Persiste el plan completo desde el editor. Escribe el documento entero
   * porque el editor siempre trabaja sobre una copia completa del plan; un
   * merge dejaría elementos borrados de los arrays a medio quitar.
   *
   * Actualiza el signal antes de esperar a la escritura: sin cobertura la
   * promesa queda pendiente (Firestore la encola en la caché persistente) y la
   * pantalla no debe quedarse colgada mostrando el plan viejo. Si la escritura
   * falla de verdad, el `onSnapshot` acabará devolviendo el estado real.
   */
  async actualizarPlan(plan: Plan): Promise<void> {
    const completo: Plan = { ...plan, actualizado: new Date().toISOString() };
    this.guardando.set(true);
    this.plan.set(completo);
    try {
      await setDoc(this.refPlan(), completo);
    } finally {
      this.guardando.set(false);
    }
  }
}
