// Rellena con los datos de tu proyecto:
// Consola de Firebase > Configuración del proyecto > Tus apps > App web > Configuración del SDK.
// Estas claves NO son secretas: la seguridad la dan las reglas de Firestore.
export const firebaseConfig = {
  apiKey: 'TU_API_KEY',
  authDomain: 'TU_PROYECTO.firebaseapp.com',
  projectId: 'TU_PROYECTO',
  storageBucket: 'TU_PROYECTO.appspot.com',
  messagingSenderId: '000000000000',
  appId: '1:000000000000:web:xxxxxxxxxxxxxxxx'
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
