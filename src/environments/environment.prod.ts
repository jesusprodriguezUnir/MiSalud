// Configuración de producción: sustituye a environment.ts en la build de
// producción (ver fileReplacements en angular.json).
import { FIREBASE_CONFIG } from './firebase.config';

export const environment = {
  production: true,
  firebase: FIREBASE_CONFIG,
  useEmulators: false,
};

export { PERFIL_DEFECTO } from './firebase.config';
