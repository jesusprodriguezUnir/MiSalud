// Plantilla de configuración. Copia este fichero a `environment.ts` y rellena
// con los datos de tu proyecto:
//   Consola de Firebase > Configuración del proyecto > Tus apps > App web.
//
// Estas claves NO son secretas: la seguridad la dan las reglas de Firestore.
// Por eso `environment.ts` se versiona igualmente; esta plantilla queda solo
// como documentación del formato.
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
  // Usar los emuladores locales en desarrollo (npm run emulators).
  useEmulators: false,
};

// Peso de partida y objetivo. Se pueden cambiar aquí o desde Firestore en
// usuarios/{uid}/perfil/datos (Firestore manda tras el primer arranque).
export const PERFIL_DEFECTO: Perfil = {
  nombre: 'Ana',
  alturaCm: 158.5,
  pesoInicial: 66.5,
  fechaInicio: '2026-06-03',
  objetivo: 60,
};
