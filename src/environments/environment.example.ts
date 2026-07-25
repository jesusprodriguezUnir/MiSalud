// Plantilla de configuración. Los datos reales viven en `firebase.config.ts`
// (claves de Firebase + perfil por defecto), compartido por `environment.ts` y
// `environment.prod.ts`; estos dos solo declaran `production` y `useEmulators`.
//
// Copia el bloque de abajo a `firebase.config.ts` y rellénalo con los datos de
//   Consola de Firebase > Configuración del proyecto > Tus apps > App web.
// Estas claves NO son secretas: la seguridad la dan las reglas de Firestore,
// por eso los ficheros se versionan igualmente.
import type { Perfil } from '../app/domain/plan.types';

export const FIREBASE_CONFIG = {
  apiKey: 'TU_API_KEY',
  authDomain: 'TU_PROYECTO.firebaseapp.com',
  projectId: 'TU_PROYECTO',
  storageBucket: 'TU_PROYECTO.appspot.com',
  messagingSenderId: '000000000000',
  appId: '1:000000000000:web:xxxxxxxxxxxxxxxx',
};

// Peso de partida y objetivo. Se pueden cambiar aquí o desde Firestore en
// usuarios/{uid}/perfil/datos (Firestore manda tras el primer arranque).
export const PERFIL_DEFECTO: Perfil = {
  nombre: 'Jesús',
  alturaCm: 171,
  pesoInicial: 90,
  fechaInicio: '2026-08-01',
  objetivo: 80,
};
