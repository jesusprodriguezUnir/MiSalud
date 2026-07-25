// Rellena las fotos de los platos (`receta.fotoUrl`) en el plan vivo de Firestore.
//
// El seed sólo se aplica cuando `plan/actual` no existe, así que un plan ya
// sembrado nunca vería las fotos añadidas a `plan.seed.ts`. Este script cierra
// ese hueco: lee el plan real del usuario y le pega las fotos que le faltan,
// emparejando por nombre de plato. No toca `version` ni ningún otro campo, y
// por defecto respeta las fotos que ya estuvieran puestas desde la app.
//
// Uso:
//   node scripts/fotos.mjs jesusprodriguez@gmail.com --dry-run
//   node scripts/fotos.mjs <uid|email>
//   node scripts/fotos.mjs <uid|email> --forzar   # sobrescribe fotos existentes

import { initializeApp, cert, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { readFileSync, readdirSync } from 'node:fs';
import ts from 'typescript';

const args = process.argv.slice(2);
const inputArg = args.find((a) => !a.startsWith('--'));
const dryRun = args.includes('--dry-run');
const forzar = args.includes('--forzar');

if (!inputArg) {
  console.error('Uso: node scripts/fotos.mjs <uid|email> [--dry-run] [--forzar]');
  process.exit(1);
}

const emulador = !!process.env.FIRESTORE_EMULATOR_HOST;
const projectId = process.env.GCLOUD_PROJECT || process.env.GOOGLE_CLOUD_PROJECT || 'misalud-133ef';

// Mismo descubrimiento de credenciales que scripts/seed.mjs.
function findServiceAccount() {
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) return applicationDefault();
  const serviceAccountFile = readdirSync('./').find(
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

if (inputArg.includes('@')) {
  const userRecord = await getAuth().getUserByEmail(inputArg);
  uid = userRecord.uid;
  console.log(`Email ${inputArg} -> UID: ${uid}`);
}

// El catálogo de fotos no se duplica aquí: se extrae del propio seed, que es la
// única fuente de verdad de qué foto le corresponde a cada plato.
async function loadPlanSeed() {
  const tsCode = readFileSync('./src/app/domain/plan.seed.ts', 'utf8');
  const jsCode = ts.transpileModule(tsCode, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ESNext },
  }).outputText;
  return import(`data:text/javascript;base64,${Buffer.from(jsCode).toString('base64')}`);
}

const { DIETA } = await loadPlanSeed();

/** nombre de plato -> fotoUrl, según el seed. */
const catalogo = new Map();
for (const dia of DIETA) {
  for (const ingesta of Object.values(dia.ingestas ?? {})) {
    for (const item of ingesta.items ?? []) {
      if (item.receta?.fotoUrl) catalogo.set(item.n, item.receta.fotoUrl);
    }
  }
}

if (!catalogo.size) {
  console.error('El seed no tiene ninguna receta con fotoUrl. Nada que hacer.');
  process.exit(1);
}
console.log(`Catálogo: ${catalogo.size} platos con foto en el seed.`);

const ref = db.doc(`usuarios/${uid}/plan/actual`);
const snap = await ref.get();
if (!snap.exists) {
  console.error(
    `No existe usuarios/${uid}/plan/actual. Siembra el plan primero (npm run seed ${inputArg}).`,
  );
  process.exit(1);
}

const dieta = snap.data().dieta ?? [];
const puestas = [];
const respetadas = [];
const sinFoto = [];

for (const dia of dieta) {
  for (const ingesta of Object.values(dia.ingestas ?? {})) {
    for (const item of ingesta.items ?? []) {
      if (!item.receta) continue;
      const url = catalogo.get(item.n);
      if (!url) {
        sinFoto.push(`${dia.dia}: ${item.n}`);
        continue;
      }
      if (item.receta.fotoUrl && !forzar) {
        respetadas.push(`${dia.dia}: ${item.n}`);
        continue;
      }
      if (item.receta.fotoUrl === url) continue;
      item.receta.fotoUrl = url;
      puestas.push(`${dia.dia}: ${item.n}`);
    }
  }
}

const linea = (l) => l.forEach((x) => console.log(`   · ${x}`));
console.log(`\nFotos a escribir: ${puestas.length}`);
linea(puestas);
if (respetadas.length) {
  console.log(
    `\nYa tenían foto (respetadas, usa --forzar para sobrescribir): ${respetadas.length}`,
  );
  linea(respetadas);
}
if (sinFoto.length) {
  console.log(`\nRecetas del plan sin foto en el catálogo: ${sinFoto.length}`);
  linea(sinFoto);
}

if (!puestas.length) {
  console.log('\nNada que actualizar.');
  process.exit(0);
}

if (dryRun) {
  console.log('\n--dry-run: no se ha escrito nada.');
  process.exit(0);
}

// Sólo `dieta` y `actualizado`: `version` no se toca, para no disparar ninguna
// lógica de resiembra ni pisar el resto del plan.
await ref.update({ dieta, actualizado: new Date().toISOString() });

console.log(
  `\n✅ ${puestas.length} fotos escritas en usuarios/${uid}/plan/actual (${emulador ? 'emulador' : 'producción'}).`,
);
process.exit(0);
