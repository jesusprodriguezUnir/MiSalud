// Siembra `perfil/datos` y `plan/actual` para un uid o email, contra el emulador o
// contra producción según FIRESTORE_EMULATOR_HOST.
//
// Uso:
//   node scripts/seed.mjs jesusprodriguez@gmail.com
//   node scripts/seed.mjs <uid>

import { initializeApp, cert, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { credencialesJson, PROJECT_ID } from './lib/credenciales.mjs';
import { cargarPlanSeed } from './lib/seed.mjs';
import { resolverUid } from './lib/uid.mjs';

const inputArg = process.argv[2];
if (!inputArg) {
  console.error('Uso: node scripts/seed.mjs <uid|email>');
  process.exit(1);
}

const emulador = !!process.env.FIRESTORE_EMULATOR_HOST;
const projectId = PROJECT_ID;

function credencial() {
  const json = credencialesJson();
  return json ? cert(json) : applicationDefault();
}

initializeApp(emulador ? { projectId } : { credential: credencial(), projectId });

const db = getFirestore();
const uid = await resolverUid(inputArg);

const { PLAN_VERSION, DIETA, ENTRENO, HABITOS, OBJETIVOS } = await cargarPlanSeed();

const perfil = {
  nombre: 'Jesús',
  alturaCm: 171,
  pesoInicial: 90,
  fechaInicio: '2026-08-01',
  objetivo: 80,
};

const plan = {
  version: PLAN_VERSION,
  actualizado: new Date().toISOString(),
  dieta: DIETA,
  entreno: ENTRENO,
  habitos: HABITOS,
  objetivos: OBJETIVOS,
};

try {
  await db.doc(`usuarios/${uid}/perfil/datos`).set(perfil);
  await db.doc(`usuarios/${uid}/plan/actual`).set(plan);
} catch (e) {
  console.error(
    `Fallo al escribir en usuarios/${uid} (${e.code ?? 'error'}): ${e.message}\n` +
      'Revisa que el service account tenga permisos de Firestore sobre el proyecto ' +
      `${projectId}${emulador ? ' y que el emulador siga levantado' : ''}.`,
  );
  process.exit(1);
}

console.log(
  `✅ Sembrados exitosamente perfil y plan de dietas para el usuario (UID: ${uid}) en ${emulador ? 'emulador' : 'producción Firestore'}.`,
);
process.exit(0);
