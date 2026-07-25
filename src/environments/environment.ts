// Configuración de desarrollo. Las claves de Firebase y el perfil por defecto
// viven en firebase.config.ts, compartidos con producción.
import { FIREBASE_CONFIG } from './firebase.config';

export const environment = {
  production: false,
  firebase: FIREBASE_CONFIG,
  // Pon a true para hablar con los emuladores locales (npm run emulators).
  useEmulators: false,
};

export { PERFIL_DEFECTO } from './firebase.config';
