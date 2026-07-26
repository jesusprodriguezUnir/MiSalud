// Resolución de <uid|email> a uid real. Compartida por seed.mjs y fotos.mjs.
//
// Si se pasa un email y Auth no lo resuelve se aborta: continuar con el email
// como uid escribiría en `usuarios/{email}/...`, un árbol que ningún usuario
// autenticado puede leer y que ensucia producción con datos huérfanos.

import { getAuth } from 'firebase-admin/auth';

export async function resolverUid(inputArg) {
  if (!inputArg.includes('@')) return inputArg;

  try {
    const userRecord = await getAuth().getUserByEmail(inputArg);
    console.log(`Email ${inputArg} -> UID: ${userRecord.uid}`);
    return userRecord.uid;
  } catch (e) {
    console.error(
      `No se pudo resolver el email ${inputArg} en Firebase Auth: ${e.message}\n` +
        'Crea el usuario primero (o pasa directamente su uid). No se escribe nada.',
    );
    process.exit(1);
  }
}
