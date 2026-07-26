// ---------------------------------------------------------------------------
// Lectura de errores del SDK de Firebase.
//
// El patrón `(e as { code?: string }).code` estaba escrito a mano en
// auth.service y dia.service. Aquí, además, viven los mensajes en español: los
// errores de Firebase llegan en inglés y con el prefijo "Firebase: Error (...)",
// que no debe acabar delante del usuario.
// ---------------------------------------------------------------------------

/** Código del error de Firebase (`auth/…`, `permission-denied`, …), o ''. */
export function codigo(e: unknown): string {
  return (e as { code?: string } | null)?.code ?? '';
}

const MENSAJES_AUTH: Record<string, string> = {
  'auth/invalid-credential': 'Correo o contraseña incorrectos.',
  'auth/invalid-email': 'El correo no es válido.',
  'auth/missing-password': 'Escribe tu contraseña.',
  'auth/user-not-found': 'Correo o contraseña incorrectos.',
  'auth/wrong-password': 'Correo o contraseña incorrectos.',
  'auth/user-disabled': 'Esta cuenta está deshabilitada.',
  'auth/too-many-requests': 'Demasiados intentos. Espera unos minutos.',
  'auth/network-request-failed': 'Sin conexión con Firebase. Revisa tu red.',
  'auth/internal-error': 'Error del servidor de autenticación. Inténtalo de nuevo.',
  'auth/operation-not-allowed': 'El acceso por correo y contraseña no está habilitado.',
};

/** Mensaje en español para un error de Auth. */
export function mensajeAuth(e: unknown): string {
  const code = codigo(e);
  return (
    MENSAJES_AUTH[code] ?? (code ? `No se ha podido entrar (${code}).` : 'No se ha podido entrar.')
  );
}

// Códigos que significan "esta escritura no va a suceder nunca". El resto
// (unavailable, deadline-exceeded, aborted…) son transitorios: Firestore los
// reintenta desde su caché persistente al recuperar la conexión.
const ERRORES_PERMANENTES = new Set([
  'permission-denied',
  'unauthenticated',
  'invalid-argument',
  'failed-precondition',
  'not-found',
  'out-of-range',
]);

export function esPermanente(e: unknown): boolean {
  return ERRORES_PERMANENTES.has(codigo(e));
}
