import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  provideZoneChangeDetection,
  isDevMode,
} from '@angular/core';
import { provideRouter, withInMemoryScrolling } from '@angular/router';

import { routes } from './app.routes';
import { provideFirebase } from './core/firebase.providers';
import { provideServiceWorker } from '@angular/service-worker';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    // Sin `withComponentInputBinding()`: ninguna ruta lleva parámetros, así que
    // solo añadía trabajo por navegación. `scrollPositionRestoration: 'top'`
    // evita entrar en una pantalla a media altura tras haber hecho scroll en
    // la anterior (se notaba al saltar de Semana a Hoy).
    provideRouter(routes, withInMemoryScrolling({ scrollPositionRestoration: 'top' })),
    ...provideFirebase(),
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000',
    }),
  ],
};
