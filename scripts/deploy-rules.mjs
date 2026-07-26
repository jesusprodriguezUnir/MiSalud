// Despliega `firestore.rules` usando la API de Firebase Rules.
//
// Equivale a `firebase deploy --only firestore:rules`, pero sin pasar por el
// CLI: el CLI comprueba antes que la API de Firestore esté habilitada, lo que
// exige el permiso `serviceusage.services.get` que la cuenta de servicio de
// Firebase Admin no trae. Esta ruta solo necesita permisos de firebaserules,
// que sí tiene.
//
// Uso:
//   node scripts/deploy-rules.mjs            # usa ~/.config/misalud/sa.json
//   GOOGLE_APPLICATION_CREDENTIALS=... node scripts/deploy-rules.mjs
import { readFileSync } from 'node:fs';
import { GoogleAuth } from 'google-auth-library';
import { credencialesJson, PROJECT_ID } from './lib/credenciales.mjs';

const PROJECT = PROJECT_ID;

const client = await new GoogleAuth({
  // `null` significa "resuélvelo del entorno" (GOOGLE_APPLICATION_CREDENTIALS);
  // GoogleAuth espera `undefined` en ese caso.
  credentials: credencialesJson() ?? undefined,
  scopes: ['https://www.googleapis.com/auth/cloud-platform'],
}).getClient();

const base = `https://firebaserules.googleapis.com/v1/projects/${PROJECT}`;
const source = readFileSync('./firestore.rules', 'utf8');

let ruleset;
try {
  ruleset = await client.request({
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
} catch (e) {
  const detalle = e.response?.data?.error?.message ?? e.message;
  console.error(
    `Fallo al publicar las reglas en ${PROJECT}: ${detalle}\n` +
      'Si el error es de sintaxis, corrígelo en firestore.rules; si es de permisos, ' +
      'el service account necesita el rol Firebase Rules Admin.',
  );
  process.exit(1);
}

console.log(`Reglas desplegadas en ${PROJECT} (${ruleset.data.name}).`);
process.exit(0);
