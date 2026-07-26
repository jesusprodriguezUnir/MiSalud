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
import { mensajeAuth } from './firebase.errors';

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
      throw new Error(mensajeAuth(err));
    }
  }

  logout(): Promise<void> {
    return signOut(this.auth);
  }
}
