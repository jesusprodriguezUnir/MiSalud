import { Injectable, inject, signal } from '@angular/core';
import {
  Auth,
  User,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence,
} from '@angular/fire/auth';

// Mensajes en español para los errores de Auth más frecuentes. Se mantiene el
// mismo mapeo que la app vanilla para no filtrar trazas de Firebase al usuario.
const MENSAJES: Record<string, string> = {
  'auth/invalid-credential': 'Correo o contraseña incorrectos.',
  'auth/invalid-email': 'El correo no es válido.',
  'auth/too-many-requests': 'Demasiados intentos. Espera unos minutos.',
  'auth/network-request-failed': 'Sin conexión con Firebase.',
};

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly auth = inject(Auth);

  /** Usuario actual (null si no hay sesión). `undefined` = aún sin resolver. */
  readonly usuario = signal<User | null | undefined>(undefined);

  constructor() {
    onAuthStateChanged(this.auth, (user) => this.usuario.set(user));
  }

  get uid(): string | null {
    return this.usuario()?.uid ?? null;
  }

  /** Inicia sesión con persistencia local. Lanza un `Error` con mensaje legible. */
  async login(email: string, pass: string): Promise<void> {
    try {
      await setPersistence(this.auth, browserLocalPersistence);
      await signInWithEmailAndPassword(this.auth, email.trim(), pass);
    } catch (err: unknown) {
      const code = (err as { code?: string }).code ?? '';
      throw new Error(MENSAJES[code] ?? `No se ha podido entrar (${code}).`);
    }
  }

  logout(): Promise<void> {
    return signOut(this.auth);
  }
}
