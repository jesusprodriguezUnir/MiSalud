// Datos compartidos por todos los entornos. Este fichero NO entra en el
// fileReplacements de angular.json, así que ambos environments pueden
// importarlo sin crear una definición circular.
//
// Las claves de Firebase NO son secretas: la seguridad la dan firestore.rules.
import type { Perfil } from '../app/domain/plan.types';

export const FIREBASE_CONFIG = {
  apiKey: 'AIzaSyAMJpcsEdghzQb70ZkBpWFFw2gqNyOElig',
  authDomain: 'misalud-133ef.firebaseapp.com',
  projectId: 'misalud-133ef',
  storageBucket: 'misalud-133ef.firebasestorage.app',
  messagingSenderId: '322417702439',
  appId: '1:322417702439:web:8d78ee905770f844fb0002',
};

// Perfil de arranque: solo se usa la primera vez, antes de que exista
// usuarios/{uid}/perfil/datos en Firestore. Después manda el documento remoto.
export const PERFIL_DEFECTO: Perfil = {
  nombre: 'Jesús',
  alturaCm: 171,
  pesoInicial: 90,
  fechaInicio: '2026-08-01',
  objetivo: 80,
};
