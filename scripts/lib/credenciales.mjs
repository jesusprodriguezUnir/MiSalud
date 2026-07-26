// Resolución de credenciales de Firebase Admin, compartida por los tres scripts.
//
// La clave privada del service account NO debe vivir en el repositorio: cualquier
// zip, backup o sync del directorio la expondría. Se busca, en orden:
//
//   1. GOOGLE_APPLICATION_CREDENTIALS (lo estándar; es lo que usa CI).
//   2. MISALUD_SA_PATH, si se quiere apuntar a otra ruta puntualmente.
//   3. ~/.config/misalud/sa.json  (en Windows, %USERPROFILE%\.config\misalud\sa.json).
//
// Si no aparece por ninguna vía se aborta con instrucciones. Si además se detecta
// un JSON de service account tirado en la raíz del repo, se avisa explícitamente
// para que se mueva fuera (antes los scripts lo escaneaban, lo que incentivaba
// justo lo contrario).

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

/** Ruta canónica del service account fuera del repositorio. */
export const RUTA_SA = join(homedir(), '.config', 'misalud', 'sa.json');

/** Nombre de un JSON de service account olvidado en la raíz del repo, si lo hay. */
function saEnRaiz() {
  try {
    return readdirSync('./').find(
      (f) =>
        f.endsWith('.json') && (f.includes('firebase-adminsdk') || f === 'service-account.json'),
    );
  } catch {
    return undefined;
  }
}

function abortarSinCredenciales() {
  const suelto = saEnRaiz();
  console.error('No se han encontrado credenciales de Firebase Admin.\n');
  if (suelto) {
    console.error(
      `⚠️  Hay un service account en la raíz del repo (${suelto}). Los scripts ya no lo leen\n` +
        '   desde ahí a propósito. Muévelo fuera del proyecto:\n' +
        `     mkdir -p "${join(homedir(), '.config', 'misalud')}"\n` +
        `     mv "${suelto}" "${RUTA_SA}"\n` +
        '   Y si ese fichero ha salido alguna vez del disco local (sync, email, backup),\n' +
        '   rota la clave en la consola de Google Cloud.\n',
    );
  } else {
    console.error(
      `Deja el JSON del service account en:\n  ${RUTA_SA}\n` +
        'o exporta GOOGLE_APPLICATION_CREDENTIALS con su ruta.\n',
    );
  }
  process.exit(1);
}

/**
 * Contenido del service account como objeto, o `null` si hay que delegar en las
 * credenciales por defecto del entorno (GOOGLE_APPLICATION_CREDENTIALS).
 */
export function credencialesJson() {
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) return null;

  const ruta = process.env.MISALUD_SA_PATH || RUTA_SA;
  if (existsSync(ruta)) {
    console.log(`Usando credenciales de: ${ruta}`);
    try {
      return JSON.parse(readFileSync(ruta, 'utf8'));
    } catch (e) {
      console.error(`El service account de ${ruta} no es un JSON válido: ${e.message}`);
      process.exit(1);
    }
  }

  abortarSinCredenciales();
}

/** Id de proyecto efectivo. */
export const PROJECT_ID =
  process.env.GCLOUD_PROJECT || process.env.GOOGLE_CLOUD_PROJECT || 'misalud-133ef';
