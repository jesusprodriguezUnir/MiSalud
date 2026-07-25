import { Injectable, inject, signal } from '@angular/core';
import { Firestore, doc, getDoc, setDoc } from '@angular/fire/firestore';
import { AuthService } from './auth.service';
import { AvisoService } from './aviso.service';
import type { EstadoDia, IngestaKey } from '../domain/plan.types';

// Estado por día (comidas marcadas y entreno hecho). Cachea en memoria en un
// mapa fecha → estado, expuesto como signal, y persiste con merge para no pisar
// otros campos. El id del documento es la fecha YYYY-MM-DD.
//
// Los toggles son optimistas pero con rollback: si la escritura falla de verdad
// (permisos, reglas) se restaura el estado anterior y se avisa, para que la UI
// nunca muestre un check que no llegó a guardarse. Sin conexión la promesa de
// `setDoc` queda pendiente —no rechaza— porque Firestore la encola en la caché
// persistente, así que estar offline no dispara el rollback.
//
// Ojo: "offline" no es lo único que no debe revertir. Con red intermitente (un
// túnel, wifi que cae y vuelve, el backend saturado) `setDoc` sí rechaza con un
// código transitorio aunque el cambio siga encolado en la caché y acabe
// subiendo. Revertir ahí desmarcaba el check delante del usuario y, peor,
// dejaba el signal local por detrás del dato que ya iba camino del servidor.
// Solo los códigos de abajo significan "esta escritura no va a suceder nunca".
const ERRORES_PERMANENTES = new Set([
  'permission-denied',
  'unauthenticated',
  'invalid-argument',
  'failed-precondition',
  'not-found',
  'out-of-range',
]);

function codigo(e: unknown): string {
  return (e as { code?: string }).code ?? '';
}

@Injectable({ providedIn: 'root' })
export class DiaService {
  private readonly db = inject(Firestore);
  private readonly auth = inject(AuthService);
  private readonly avisos = inject(AvisoService);

  private readonly cache = signal(new Map<string, EstadoDia>());

  private ref(fecha: string) {
    const uid = this.auth.uid;
    if (!uid) throw new Error('No hay sesión iniciada');
    return doc(this.db, 'usuarios', uid, 'dias', fecha);
  }

  /** Estado del día `fecha`, cargándolo de Firestore la primera vez. */
  async cargar(fecha: string): Promise<EstadoDia> {
    const actual = this.cache().get(fecha);
    if (actual) return actual;
    const vacio: EstadoDia = { hechas: {}, entreno: false };
    try {
      const snap = await getDoc(this.ref(fecha));
      const data = snap.exists()
        ? { ...vacio, ...(snap.data() as Partial<EstadoDia>) }
        : { ...vacio };
      this.set(fecha, data);
      return data;
    } catch (e) {
      // No se cachea el vacío: si se guardara, un fallo puntual dejaría el día
      // en blanco para toda la sesión y el siguiente toggle escribiría encima
      // de lo que sí hay en Firestore.
      console.warn('dia', codigo(e), e);
      this.avisos.mostrar('No se ha podido cargar el día.');
      return vacio;
    }
  }

  /** Estado ya cargado en caché (sin ir a red). */
  estado(fecha: string): EstadoDia {
    return this.cache().get(fecha) ?? { hechas: {}, entreno: false };
  }

  async toggleIngesta(fecha: string, key: IngestaKey): Promise<void> {
    const previo = this.estado(fecha);
    const est = { ...previo, hechas: { ...previo.hechas } };
    est.hechas[key] = !est.hechas[key];
    await this.aplicar(fecha, est, previo);
  }

  async toggleEntreno(fecha: string): Promise<void> {
    const previo = this.estado(fecha);
    await this.aplicar(fecha, { ...previo, entreno: !previo.entreno }, previo);
  }

  /** Pinta el cambio, lo persiste y solo lo deshace si el fallo es definitivo. */
  private async aplicar(fecha: string, est: EstadoDia, previo: EstadoDia): Promise<void> {
    this.set(fecha, est);
    try {
      await setDoc(this.ref(fecha), { ...est, fecha }, { merge: true });
    } catch (e) {
      const cod = codigo(e);
      console.warn('guardarDia', cod, e);
      if (ERRORES_PERMANENTES.has(cod)) {
        this.set(fecha, previo);
        this.avisos.mostrar(`No se ha podido guardar el cambio (${cod || 'error'}).`);
      } else {
        // Transitorio: el cambio sigue en la caché de Firestore y se sincroniza
        // al recuperar la conexión. No se toca el estado local.
        this.avisos.mostrar('Guardado en el dispositivo, se sincronizará al reconectar.', 'ok');
      }
    }
  }

  private set(fecha: string, est: EstadoDia): void {
    const m = new Map(this.cache());
    m.set(fecha, est);
    this.cache.set(m);
  }
}
