import { Injectable, signal } from '@angular/core';

export type TipoAviso = 'error' | 'ok';
export interface Aviso {
  texto: string;
  tipo: TipoAviso;
}

// Cola de un solo hueco para avisos efímeros (toast). Los servicios de datos
// la usan para que un fallo de escritura deje de ser un console.warn invisible.
@Injectable({ providedIn: 'root' })
export class AvisoService {
  readonly aviso = signal<Aviso | null>(null);
  private temporizador: ReturnType<typeof setTimeout> | null = null;

  mostrar(texto: string, tipo: TipoAviso = 'error', ms = 5000): void {
    if (this.temporizador) clearTimeout(this.temporizador);
    this.aviso.set({ texto, tipo });
    this.temporizador = setTimeout(() => this.cerrar(), ms);
  }

  cerrar(): void {
    if (this.temporizador) clearTimeout(this.temporizador);
    this.temporizador = null;
    this.aviso.set(null);
  }
}
