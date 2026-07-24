import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/login/login.page').then((m) => m.LoginPage),
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./shell/shell').then((m) => m.Shell),
    children: [
      { path: 'hoy', loadComponent: () => import('./features/hoy/hoy.page').then((m) => m.HoyPage) },
      {
        path: 'semana',
        loadComponent: () => import('./features/semana/semana.page').then((m) => m.SemanaPage),
      },
      {
        path: 'peso',
        loadComponent: () => import('./features/peso/peso.page').then((m) => m.PesoPage),
      },
      {
        path: 'compra',
        loadComponent: () => import('./features/compra/compra.page').then((m) => m.CompraPage),
      },
      { path: '', redirectTo: 'hoy', pathMatch: 'full' },
    ],
  },
  { path: '**', redirectTo: '' },
];
