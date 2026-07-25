// Configuración de producción. Comparte las mismas claves de Firebase (que son
// públicas) que desarrollo, con producción activada y sin emuladores. No importa
// de environment.ts porque en la build de producción ese fichero se sustituye
// por este (evita una definición circular).
import type { Perfil } from '../app/domain/plan.types';

export const environment = {
  production: true,
  firebase: {
    apiKey: 'AIzaSyAMJpcsEdghzQb70ZkBpWFFw2gqNyOElig',
    authDomain: 'misalud-133ef.firebaseapp.com',
    projectId: 'misalud-133ef',
    storageBucket: 'misalud-133ef.firebasestorage.app',
    messagingSenderId: '322417702439',
    appId: '1:322417702439:web:8d78ee905770f844fb0002',
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
