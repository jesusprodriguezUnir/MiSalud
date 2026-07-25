import { Injectable, inject, signal } from '@angular/core';
import { Firestore, doc, getDoc, setDoc } from '@angular/fire/firestore';
import { AuthService } from './auth.service';
import { AvisoService } from './aviso.service';
import { PERFIL_DEFECTO } from '../../environments/environment';
import { DIETA, ENTRENO, HABITOS, OBJETIVOS, PLAN_VERSION } from '../domain/plan.seed';
import type { Perfil, Plan } from '../domain/plan.types';

// Carga y siembra del plan y el perfil. Replica el arranque de la app vanilla:
// si el documento remoto no existe (o el plan tiene otra versión) se siembra con
// los datos del código; a partir de ahí manda Firestore, de modo que se pueda
// editar el plan sin volver a desplegar.
@Injectable({ providedIn: 'root' })
export class PlanService {
  private readonly db = inject(Firestore);
  private readonly auth = inject(AuthService);
  private readonly avisos = inject(AvisoService);

  /** True hasta que perfil y plan se han resuelto contra Firestore. Mientras
   * tanto los signals de abajo contienen la semilla local, que no debe pintarse
   * como si fuera el dato remoto. */
  readonly cargando = signal(true);

  readonly plan = signal<Plan>({
    version: PLAN_VERSION,
    dieta: DIETA,
    entreno: ENTRENO,
    habitos: HABITOS,
    objetivos: OBJETIVOS,
  });
  readonly perfil = signal<Perfil>({ ...PERFIL_DEFECTO });

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

  /** Carga perfil y plan, sembrando lo que falte. Se llama tras el login. */
  async cargar(): Promise<void> {
    this.cargando.set(true);
    try {
      await this.cargarPerfil();
      await this.cargarPlan();
    } finally {
      this.cargando.set(false);
    }
  }

  private async cargarPerfil(): Promise<void> {
    try {
      const snap = await getDoc(this.refPerfil());
      if (snap.exists()) {
        this.perfil.set({ ...PERFIL_DEFECTO, ...(snap.data() as Partial<Perfil>) });
      } else {
        await setDoc(this.refPerfil(), this.perfil());
      }
    } catch (e) {
      console.warn('perfil', e);
      this.avisos.mostrar('No se ha podido cargar tu perfil.');
    }
  }

  private async cargarPlan(): Promise<void> {
    try {
      const snap = await getDoc(this.refPlan());
      const data = snap.data() as Plan | undefined;
      if (snap.exists() && data?.version === PLAN_VERSION) {
        this.plan.set({
          version: data.version,
          dieta: data.dieta,
          entreno: data.entreno,
          habitos: data.habitos,
          objetivos: data.objetivos,
        });
      } else {
        const semilla: Plan = {
          version: PLAN_VERSION,
          actualizado: new Date().toISOString(),
          dieta: DIETA,
          entreno: ENTRENO,
          habitos: HABITOS,
          objetivos: OBJETIVOS,
        };
        await setDoc(this.refPlan(), semilla);
        this.plan.set(semilla);
      }
    } catch (e) {
      console.warn('plan', e);
      this.avisos.mostrar('No se ha podido cargar el plan.');
    }
  }
}
