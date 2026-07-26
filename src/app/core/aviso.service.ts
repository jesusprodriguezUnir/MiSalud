import { Injectable, signal } from '@angular/core';

export type TipoAviso = 'error' | 'ok';

/** Acción opcional del toast ("Deshacer"). Al pulsarla el aviso se cierra. */
export interface AccionAviso {
  etiqueta: string;
  ejecutar: () => void;
}

export interface Aviso {
  texto: string;
  tipo: TipoAviso;
  accion?: AccionAviso;
}

// Cola de un solo hueco para avisos efímeros (toast). Los servicios de datos
// la usan para que un fallo de escritura deje de ser un console.warn invisible.
//
// `confirmar()` es la alternativa al `confirm()` nativo para acciones
// destructivas: en vez de bloquear con un diálogo del sistema —incómodo en
// móvil y que interrumpe el gesto— se ejecuta la acción y se ofrece deshacerla
// durante unos segundos.
@Injectable({ providedIn: 'root' })
export class AvisoService {
  readonly aviso = signal<Aviso | null>(null);
  private temporizador: ReturnType<typeof setTimeout> | null = null;

  mostrar(texto: string, tipo: TipoAviso = 'error', ms = 5000): void {
    this.programar({ texto, tipo }, ms);
  }

  /** Aviso con acción de deshacer. La ventana es más larga que la de un error. */
  deshacer(texto: string, ejecutar: () => void, ms = 8000): void {
    this.programar({ texto, tipo: 'ok', accion: { etiqueta: 'Deshacer', ejecutar } }, ms);
  }

  private programar(aviso: Aviso, ms: number): void {
    if (this.temporizador) clearTimeout(this.temporizador);
    this.aviso.set(aviso);
    this.temporizador = setTimeout(() => this.cerrar(), ms);
  }

  /** Ejecuta la acción del aviso visible (si la hay) y lo cierra. */
  ejecutarAccion(): void {
    const accion = this.aviso()?.accion;
    this.cerrar();
    accion?.ejecutar();
  }

  cerrar(): void {
    if (this.temporizador) clearTimeout(this.temporizador);
    this.temporizador = null;
    this.aviso.set(null);
  }
}
