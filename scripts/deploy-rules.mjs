// Despliega `firestore.rules` usando la API de Firebase Rules.
//
// Equivale a `firebase deploy --only firestore:rules`, pero sin pasar por el
// CLI: el CLI comprueba antes que la API de Firestore esté habilitada, lo que
// exige el permiso `serviceusage.services.get` que la cuenta de servicio de
// Firebase Admin no trae. Esta ruta solo necesita permisos de firebaserules,
// que sí tiene.
//
// Uso:
//   node scripts/deploy-rules.mjs            # usa el service account de la raíz
//   GOOGLE_APPLICATION_CREDENTIALS=... node scripts/deploy-rules.mjs
import { readFileSync, readdirSync } from 'node:fs';
import { GoogleAuth } from 'google-auth-library';

const PROJECT = process.env.GCLOUD_PROJECT || process.env.GOOGLE_CLOUD_PROJECT || 'misalud-133ef';

function credenciales() {
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) return undefined; // GoogleAuth lo resuelve solo
  const fichero = readdirSync('./').find(
    (f) => f.endsWith('.json') && f.includes('firebase-adminsdk'),
  );
  if (!fichero) {
    console.error(
      'No hay credenciales: define GOOGLE_APPLICATION_CREDENTIALS o deja el JSON del service account en la raíz.',
    );
    process.exit(1);
  }
  return JSON.parse(readFileSync(fichero, 'utf8'));
}

const client = await new GoogleAuth({
  credentials: credenciales(),
  scopes: ['https://www.googleapis.com/auth/cloud-platform'],
}).getClient();

const base = `https://firebaserules.googleapis.com/v1/projects/${PROJECT}`;
const source = readFileSync('./firestore.rules', 'utf8');

const ruleset = await client.request({
  url: `${base}/rulesets`,
  method: 'POST',
  data: { source: { files: [{ name: 'firestore.rules', content: source }] } },
});

await client.request({
  url: `${base}/releases/cloud.firestore`,
  method: 'PATCH',
  data: {
    release: {
      name: `projects/${PROJECT}/releases/cloud.firestore`,
      rulesetName: ruleset.data.name,
    },
  },
});

console.log(`Reglas desplegadas en ${PROJECT} (${ruleset.data.name}).`);
process.exit(0);
