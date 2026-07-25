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
        <div class="mark"></div>
        <h1>MiSalud</h1>
        <p>Dieta, entrenamiento y peso. Un plan, un día a la vez.</p>
        <div class="hr"></div>

        <label class="kicker" for="email">Correo</label>
        <input
          id="email"
          type="email"
          [(ngModel)]="email"
          name="email"
          autocomplete="username"
          required
        />
        <label class="kicker" for="pass">Contraseña</label>
        <input
          id="pass"
          type="password"
          [(ngModel)]="pass"
          name="pass"
          autocomplete="current-password"
          required
        />

        <button class="btn" type="submit" [disabled]="cargando()">
          <span>Entrar</span><span>→</span>
        </button>
        <div class="err">{{ error() }}</div>
        <p class="nota">
          Los datos se guardan cifrados en tu cuenta. Funciona sin cobertura y sincroniza al
          volver.
        </p>
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
        width: 100%;
        max-width: 380px;
      }
      .mark {
        width: 44px;
        height: 44px;
        background: var(--accent);
      }
      .card-login h1 {
        font-size: 44px;
        letter-spacing: -0.03em;
        line-height: 0.98;
        margin: 20px 0 0;
      }
      .card-login > p {
        color: var(--muted);
        font-size: 14px;
        margin: 10px 0 0;
        max-width: 30ch;
      }
      .hr {
        height: 2px;
        background: var(--line);
        margin: 22px 0 18px;
      }
      .card-login label {
        display: block;
        margin-bottom: 5px;
      }
      .card-login input {
        border: 0;
        border-bottom: 2px solid var(--line);
        border-radius: 0;
        background: transparent;
        padding: 8px 0;
        font-size: 16px;
      }
      .card-login .btn {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 16px 18px;
        font-size: 16px;
        margin-top: 8px;
      }
      .nota {
        font-size: 12px;
        color: var(--muted);
        margin: 14px 0 0;
        line-height: 1.5;
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
