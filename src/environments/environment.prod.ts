// Configuración de producción. Comparte las mismas claves de Firebase (que son
// públicas) que desarrollo, con producción activada y sin emuladores. No importa
// de environment.ts porque en la build de producción ese fichero se sustituye
// por este (evita una definición circular).
import type { Perfil } from '../app/domain/plan.types';

export const environment = {
  production: true,
  firebase: {
    apiKey: 'TU_API_KEY',
    authDomain: 'TU_PROYECTO.firebaseapp.com',
    projectId: 'TU_PROYECTO',
    storageBucket: 'TU_PROYECTO.appspot.com',
    messagingSenderId: '000000000000',
    appId: '1:000000000000:web:xxxxxxxxxxxxxxxx',
  },
  useEmulators: false,
};

export const PERFIL_DEFECTO: Perfil = {
  nombre: 'Ana',
  alturaCm: 158.5,
  pesoInicial: 66.5,
  fechaInicio: '2026-06-03',
  objetivo: 60,
};
