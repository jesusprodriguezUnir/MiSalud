import { Injectable, effect, signal } from '@angular/core';

export type Tema = 'claro' | 'oscuro';

const STORAGE_KEY = 'misalud:tema';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly tema = signal<Tema>(this.inicial());

  constructor() {
    effect(() => {
      const t = this.tema();
      document.body.dataset['tema'] = t;
      localStorage.setItem(STORAGE_KEY, t);
    });
  }

  toggle(): void {
    this.tema.update((t) => (t === 'claro' ? 'oscuro' : 'claro'));
  }

  private inicial(): Tema {
    const guardado = localStorage.getItem(STORAGE_KEY);
    if (guardado === 'claro' || guardado === 'oscuro') return guardado;
    return matchMedia('(prefers-color-scheme: dark)').matches ? 'oscuro' : 'claro';
  }
}
