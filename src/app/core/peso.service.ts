import { Injectable, inject, signal, computed, DestroyRef } from '@angular/core';
import {
  Firestore,
  collection,
  doc,
  setDoc,
  deleteDoc,
  query,
  orderBy,
  onSnapshot,
  Unsubscribe,
} from '@angular/fire/firestore';
import { AuthService } from './auth.service';
import { AvisoService } from './aviso.service';
import { PlanService } from './plan.service';
import { mediaMovil, ritmoSemanal } from '../domain/peso.calc';
import type { Peso } from '../domain/plan.types';

// Stream de pesos ordenados por fecha, expuesto como signal, más los cálculos
// derivados (media móvil, delta desde el inicio, ritmo y distancia al objetivo)
// como computed. Alta y baja de registros por fecha (id = YYYY-MM-DD).
@Injectable({ providedIn: 'root' })
export class PesoService {
  private readonly db = inject(Firestore);
  private readonly auth = inject(AuthService);
  private readonly planSvc = inject(PlanService);
  private readonly avisos = inject(AvisoService);

  readonly pesos = signal<Peso[]>([]);
  private unsub: Unsubscribe | null = null;

  constructor() {
    // Cierra el stream si el inyector raíz se destruye (teardown de la app y
    // de los tests); en el logout lo cierra el shell llamando a detener().
    inject(DestroyRef).onDestroy(() => this.detener());
  }

  readonly mediaMovil = computed(() => mediaMovil(this.pesos()));
  readonly ultimo = computed(() => {
    const ps = this.pesos();
    return ps.length ? ps[ps.length - 1] : null;
  });
  readonly media7 = computed(() => {
    const mm = this.mediaMovil();
    return mm.length ? mm[mm.length - 1].peso : null;
  });
  readonly delta = computed(() => {
    const u = this.ultimo();
    return u ? u.peso - this.planSvc.perfil().pesoInicial : null;
  });
  readonly falta = computed(() => {
    const u = this.ultimo();
    return u ? u.peso - this.planSvc.perfil().objetivo : null;
  });
  readonly ritmo = computed(() => ritmoSemanal(this.mediaMovil()));

  private col() {
    const uid = this.auth.uid;
    if (!uid) throw new Error('No hay sesión iniciada');
    return collection(this.db, 'usuarios', uid, 'pesos');
  }

  /** Empieza a escuchar la colección de pesos. Se llama tras el login. */
  escuchar(): void {
    this.unsub?.();
    this.unsub = onSnapshot(
      query(this.col(), orderBy('fecha')),
      (qs) => {
        this.pesos.set(
          qs.docs.map((d) => d.data() as Peso).filter((p) => typeof p.peso === 'number'),
        );
      },
      (e) => {
        console.warn('pesos', e);
        this.avisos.mostrar('Se ha perdido la sincronización de los pesos.');
      },
    );
  }

  detener(): void {
    this.unsub?.();
    this.unsub = null;
  }

  async add(fecha: string, peso: number): Promise<void> {
    await setDoc(doc(this.col(), fecha), { fecha, peso, ts: Date.now() });
  }

  async borrar(fecha: string): Promise<void> {
    await deleteDoc(doc(this.col(), fecha));
  }
}
