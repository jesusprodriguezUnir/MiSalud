import { Injectable, inject, signal } from '@angular/core';
import { Firestore, doc, getDoc, setDoc } from '@angular/fire/firestore';
import { AuthService } from './auth.service';
import type { EstadoDia, IngestaKey } from '../domain/plan.types';

// Estado por día (comidas marcadas y entreno hecho). Cachea en memoria en un
// mapa fecha → estado, expuesto como signal, y persiste con merge para no pisar
// otros campos. El id del documento es la fecha YYYY-MM-DD.
@Injectable({ providedIn: 'root' })
export class DiaService {
  private readonly db = inject(Firestore);
  private readonly auth = inject(AuthService);

  private readonly cache = signal(new Map<string, EstadoDia>());

  private ref(fecha: string) {
    return doc(this.db, 'usuarios', this.auth.uid!, 'dias', fecha);
  }

  /** Estado del día `fecha`, cargándolo de Firestore la primera vez. */
  async cargar(fecha: string): Promise<EstadoDia> {
    const actual = this.cache().get(fecha);
    if (actual) return actual;
    let data: EstadoDia = { hechas: {}, entreno: false };
    try {
      const snap = await getDoc(this.ref(fecha));
      if (snap.exists()) data = { hechas: {}, entreno: false, ...(snap.data() as Partial<EstadoDia>) };
    } catch (e) {
      console.warn('dia', e);
    }
    this.set(fecha, data);
    return data;
  }

  /** Estado ya cargado en caché (sin ir a red). */
  estado(fecha: string): EstadoDia {
    return this.cache().get(fecha) ?? { hechas: {}, entreno: false };
  }

  async toggleIngesta(fecha: string, key: IngestaKey): Promise<void> {
    const est = { ...this.estado(fecha), hechas: { ...this.estado(fecha).hechas } };
    est.hechas[key] = !est.hechas[key];
    this.set(fecha, est);
    await this.guardar(fecha, est);
  }

  async toggleEntreno(fecha: string): Promise<void> {
    const est = { ...this.estado(fecha), entreno: !this.estado(fecha).entreno };
    this.set(fecha, est);
    await this.guardar(fecha, est);
  }

  private set(fecha: string, est: EstadoDia): void {
    const m = new Map(this.cache());
    m.set(fecha, est);
    this.cache.set(m);
  }

  private async guardar(fecha: string, est: EstadoDia): Promise<void> {
    try {
      await setDoc(this.ref(fecha), { ...est, fecha }, { merge: true });
    } catch (e) {
      console.warn('guardarDia', e);
    }
  }
}
