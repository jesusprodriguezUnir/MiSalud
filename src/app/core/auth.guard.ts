import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { toObservable } from '@angular/core/rxjs-interop';
import { filter, map, take } from 'rxjs';
import { AuthService } from './auth.service';

// Espera a que el estado de auth se resuelva (deja de ser `undefined`) y deja
// pasar solo si hay usuario; en caso contrario redirige a /login.
export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return toObservable(auth.usuario).pipe(
    filter((u) => u !== undefined),
    take(1),
    map((u) => (u ? true : router.createUrlTree(['/login']))),
  );
};

// Para /login: si ya hay sesión, redirige a /hoy.
export const guestGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return toObservable(auth.usuario).pipe(
    filter((u) => u !== undefined),
    take(1),
    map((u) => (u ? router.createUrlTree(['/hoy']) : true)),
  );
};
