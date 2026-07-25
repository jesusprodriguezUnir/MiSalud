// Rellena con los datos de tu proyecto:
// Consola de Firebase > Configuración del proyecto > Tus apps > App web > Configuración del SDK.
// Estas claves NO son secretas: la seguridad la dan las reglas de Firestore.
export const firebaseConfig = {
  apiKey: 'AIzaSyAMJpcsEdghzQb70ZkBpWFFw2gqNyOElig',
  authDomain: 'misalud-133ef.firebaseapp.com',
  projectId: 'misalud-133ef',
  storageBucket: 'misalud-133ef.firebasestorage.app',
  messagingSenderId: '322417702439',
  appId: '1:322417702439:web:8d78ee905770f844fb0002'
};

// Peso de partida y objetivo (se pueden cambiar aquí o desde Firestore en
// usuarios/{uid}/perfil/datos).
export const PERFIL_DEFECTO = {
  nombre: 'Ana',
  alturaCm: 158.5,
  pesoInicial: 66.5,
  fechaInicio: '2026-06-03',
  objetivo: 60
};
