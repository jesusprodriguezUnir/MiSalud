// Configuración de desarrollo. Rellena `firebase` con los datos de tu proyecto
// (Consola de Firebase > Configuración del proyecto > Tus apps > App web).
// Las claves NO son secretas: la seguridad la dan las reglas de Firestore.
import type { Perfil } from '../app/domain/plan.types';

export const environment = {
  production: false,
  firebase: {
    apiKey: 'TU_API_KEY',
    authDomain: 'TU_PROYECTO.firebaseapp.com',
    projectId: 'TU_PROYECTO',
    storageBucket: 'TU_PROYECTO.appspot.com',
    messagingSenderId: '000000000000',
    appId: '1:000000000000:web:xxxxxxxxxxxxxxxx',
  },
  // Pon a true para hablar con los emuladores locales (npm run emulators).
  useEmulators: false,
};

export const PERFIL_DEFECTO: Perfil = {
  nombre: 'Ana',
  alturaCm: 158.5,
  pesoInicial: 66.5,
  fechaInicio: '2026-06-03',
  objetivo: 60,
};
