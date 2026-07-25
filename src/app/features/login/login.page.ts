import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'app-login',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule],
  template: `
    <div id="login">
      <form class="card-login" (ngSubmit)="entrar()">
        <h1>Plan de Jesús</h1>
        <p>Dieta, entrenamiento y peso, en un sitio.</p>
        <input
          type="email"
          [(ngModel)]="email"
          name="email"
          placeholder="Correo"
          autocomplete="username"
          required
        />
        <input
          type="password"
          [(ngModel)]="pass"
          name="pass"
          placeholder="Contraseña"
          autocomplete="current-password"
          required
        />
        <button class="btn" type="submit" [disabled]="cargando()">Entrar</button>
        <div class="err">{{ error() }}</div>
      </form>
    </div>
  `,
  styles: [
    `
      #login {
        display: grid;
        min-height: 100dvh;
        place-items: center;
        padding: 24px;
      }
      .card-login {
        background: var(--surface);
        border: 1px solid var(--line);
        border-radius: var(--radius);
        box-shadow: var(--shadow);
        padding: 28px;
        width: 100%;
        max-width: 380px;
      }
      .card-login h1 {
        font-size: 22px;
        margin-bottom: 4px;
      }
      .card-login p {
        color: var(--muted);
        font-size: 14px;
        margin: 0 0 20px;
      }
    `,
  ],
})
export class LoginPage {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  email = '';
  pass = '';
  readonly error = signal('');
  readonly cargando = signal(false);

  async entrar(): Promise<void> {
    this.error.set('');
    this.cargando.set(true);
    try {
      await this.auth.login(this.email, this.pass);
      await this.router.navigate(['/hoy']);
    } catch (e) {
      this.error.set((e as Error).message);
    } finally {
      this.cargando.set(false);
    }
  }
}
