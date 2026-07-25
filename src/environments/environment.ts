// Configuración de desarrollo. Rellena `firebase` con los datos de tu proyecto
// (Consola de Firebase > Configuración del proyecto > Tus apps > App web).
// Las claves NO son secretas: la seguridad la dan las reglas de Firestore.
import type { Perfil } from '../app/domain/plan.types';

export const environment = {
  production: false,
  firebase: {
    apiKey: 'AIzaSyAMJpcsEdghzQb70ZkBpWFFw2gqNyOElig',
    authDomain: 'misalud-133ef.firebaseapp.com',
    projectId: 'misalud-133ef',
    storageBucket: 'misalud-133ef.firebasestorage.app',
    messagingSenderId: '322417702439',
    appId: '1:322417702439:web:8d78ee905770f844fb0002',
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
