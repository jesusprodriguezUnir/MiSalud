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
import { codigo } from './firebase.errors';
import { mediaMovil, ritmoSemanal } from '../domain/peso.calc';
import { PESO_MAX, PESO_MIN, pesoValido } from '../domain/plan.types';
import type { Peso } from '../domain/plan.types';

/** Espera antes del n-ésimo reintento del stream: 2 s, 4 s, 8 s, 16 s, 30 s. */
const ESPERA_REINTENTO_MS = [2000, 4000, 8000, 16000, 30000];

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
  /** True cuando el stream ha muerto y no se ha podido restablecer. La pantalla
   * de Peso lo usa para ofrecer "Reintentar" en vez de mostrar datos congelados. */
  readonly desconectado = signal(false);

  private unsub: Unsubscribe | null = null;
  private reintento: ReturnType<typeof setTimeout> | null = null;
  private intentos = 0;

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

  /**
   * Empieza a escuchar la colección de pesos. Se llama tras el login.
   *
   * `onSnapshot` destruye el listener al entrar en el callback de error, así que
   * sin reintento un `permission-denied` puntual (token recién caducado, por
   * ejemplo) dejaba los pesos congelados hasta recargar la app. Se reabre con
   * backoff creciente y, si se agotan los intentos, se marca `desconectado` para
   * que la pantalla ofrezca un "Reintentar" explícito.
   */
  escuchar(): void {
    this.detener();
    this.desconectado.set(false);
    this.unsub = onSnapshot(
      query(this.col(), orderBy('fecha')),
      (qs) => {
        this.intentos = 0;
        this.desconectado.set(false);
        this.pesos.set(
          qs.docs.map((d) => d.data() as Peso).filter((p) => typeof p.peso === 'number'),
        );
      },
      (e) => {
        console.warn('pesos', codigo(e), e);
        this.unsub = null;
        this.programarReintento();
      },
    );
  }

  private programarReintento(): void {
    const espera = ESPERA_REINTENTO_MS[this.intentos];
    if (espera === undefined) {
      this.desconectado.set(true);
      this.avisos.mostrar('Se ha perdido la sincronización de los pesos.');
      return;
    }
    this.intentos++;
    this.reintento = setTimeout(() => {
      this.reintento = null;
      // Si mientras tanto se ha cerrado la sesión, `col()` lanzaría.
      if (!this.auth.uid) return;
      this.escuchar();
    }, espera);
  }

  /** Reabre el stream desde cero. Lo llama el botón "Reintentar" de la pantalla. */
  reconectar(): void {
    this.intentos = 0;
    this.escuchar();
  }

  detener(): void {
    this.unsub?.();
    this.unsub = null;
    if (this.reintento) {
      clearTimeout(this.reintento);
      this.reintento = null;
    }
  }

  /** Cierra el stream y borra los pesos de memoria (logout). */
  reset(): void {
    this.detener();
    this.intentos = 0;
    this.pesos.set([]);
  }

  /**
   * Alta o actualización del peso de un día. Valida aquí y no solo en la UI:
   * las reglas de Firestore rechazan un peso fuera de rango con
   * `permission-denied`, un error mucho menos claro que el de esta guarda, y
   * `fecha` tiene que coincidir con el id del documento (lo exigen las reglas
   * porque el `orderBy('fecha')` del stream asume que van sincronizados).
   */
  async add(fecha: string, peso: number): Promise<void> {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
      throw new Error(`Fecha no válida: ${fecha} (se espera YYYY-MM-DD).`);
    }
    if (!pesoValido(peso)) {
      throw new Error(`Peso fuera de rango: debe estar entre ${PESO_MIN} y ${PESO_MAX} kg.`);
    }
    await setDoc(doc(this.col(), fecha), { fecha, peso, ts: Date.now() });
  }

  async borrar(fecha: string): Promise<void> {
    await deleteDoc(doc(this.col(), fecha));
  }
}
