// Siembra `perfil/datos` y `plan/actual` para un uid o email, contra el emulador o
// contra producción según FIRESTORE_EMULATOR_HOST.
//
// Uso:
//   node scripts/seed.mjs jesusprodriguez@gmail.com
//   node scripts/seed.mjs <uid>

import { initializeApp, cert, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { readFileSync, readdirSync } from 'node:fs';
import ts from 'typescript';

const inputArg = process.argv[2];
if (!inputArg) {
  console.error('Uso: node scripts/seed.mjs <uid|email>');
  process.exit(1);
}

const emulador = !!process.env.FIRESTORE_EMULATOR_HOST;
const projectId = process.env.GCLOUD_PROJECT || process.env.GOOGLE_CLOUD_PROJECT || 'misalud-133ef';

// Buscar service account JSON si no está en env
function findServiceAccount() {
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    return applicationDefault();
  }
  const files = readdirSync('./');
  const serviceAccountFile = files.find(
    (f) => f.endsWith('.json') && (f.includes('firebase-adminsdk') || f === 'service-account.json'),
  );
  if (serviceAccountFile) {
    console.log(`Usando credenciales de: ${serviceAccountFile}`);
    return cert(JSON.parse(readFileSync(serviceAccountFile, 'utf8')));
  }
  return applicationDefault();
}

initializeApp(emulador ? { projectId } : { credential: findServiceAccount(), projectId });

const db = getFirestore();
let uid = inputArg;

// Resolver UID si nos pasan un email
if (inputArg.includes('@')) {
  try {
    const userRecord = await getAuth().getUserByEmail(inputArg);
    uid = userRecord.uid;
    console.log(`Usuario encriptado/encontrado por email ${inputArg} -> UID: ${uid}`);
  } catch (e) {
    console.warn(
      `No se pudo resolver el email ${inputArg} en Auth (¿tal vez sea local/emulador sin usuario previo?): ${e.message}`,
    );
  }
}

// Cargar dinámicamente la semilla desde src/app/domain/plan.seed.ts
async function loadPlanSeed() {
  const tsCode = readFileSync('./src/app/domain/plan.seed.ts', 'utf8');
  const jsCode = ts.transpileModule(tsCode, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ESNext },
  }).outputText;
  const base64 = Buffer.from(jsCode).toString('base64');
  return import(`data:text/javascript;base64,${base64}`);
}

const { PLAN_VERSION, DIETA, ENTRENO, HABITOS, OBJETIVOS } = await loadPlanSeed();

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

await db.doc(`usuarios/${uid}/perfil/datos`).set(perfil);
await db.doc(`usuarios/${uid}/plan/actual`).set(plan);

console.log(
  `✅ Sembrados exitosamente perfil y plan de dietas para el usuario (UID: ${uid}) en ${emulador ? 'emulador' : 'producción Firestore'}.`,
);
process.exit(0);
