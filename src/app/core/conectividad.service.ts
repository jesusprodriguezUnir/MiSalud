import { Injectable, signal } from '@angular/core';

// Señal de conectividad para la banda "Sin conexión". La caché de Firestore
// sigue funcionando offline; esto es solo el aviso visual.
@Injectable({ providedIn: 'root' })
export class ConectividadService {
  readonly online = signal(navigator.onLine);

  constructor() {
    window.addEventListener('online', () => this.online.set(true));
    window.addEventListener('offline', () => this.online.set(false));
  }
}
