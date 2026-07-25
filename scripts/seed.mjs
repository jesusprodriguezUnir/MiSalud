// Siembra `perfil/datos` y `plan/actual` para un uid, contra el emulador o
// contra producción según FIRESTORE_EMULATOR_HOST. Evita depender del primer
// arranque de la app.
//
// Uso:
//   FIRESTORE_EMULATOR_HOST=localhost:8080 GCLOUD_PROJECT=demo-misalud \
//     node scripts/seed.mjs <uid>
//
// Contra producción hace falta credenciales de admin (GOOGLE_APPLICATION_CREDENTIALS).
import { initializeApp, cert, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'node:fs';

const uid = process.argv[2];
if (!uid) {
  console.error('Uso: node scripts/seed.mjs <uid>');
  process.exit(1);
}

const emulador = !!process.env.FIRESTORE_EMULATOR_HOST;
const projectId = process.env.GCLOUD_PROJECT || process.env.GOOGLE_CLOUD_PROJECT || 'demo-misalud';

initializeApp(
  emulador
    ? { projectId }
    : process.env.GOOGLE_APPLICATION_CREDENTIALS
      ? { credential: applicationDefault(), projectId }
      : { credential: cert(JSON.parse(readFileSync('./service-account.json', 'utf8'))), projectId },
);

const db = getFirestore();

// Datos mínimos de arranque. El plan completo se siembra desde la app en el
// primer login; aquí dejamos perfil y una versión marcadora del plan para poder
// probar reglas y despliegue sin abrir la UI.
const perfil = {
  nombre: 'Jesús',
  alturaCm: 171,
  pesoInicial: 90,
  fechaInicio: '2026-08-01',
  objetivo: 80,
};

await db.doc(`usuarios/${uid}/perfil/datos`).set(perfil);
console.log(`Sembrado perfil de ${uid} en ${emulador ? 'emulador' : 'producción'}.`);
process.exit(0);
