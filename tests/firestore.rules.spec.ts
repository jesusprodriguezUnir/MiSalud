import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { beforeAll, afterAll, beforeEach, describe, it } from 'vitest';
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
  RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';

// Tests de las reglas de firestore.rules contra el emulador. Requieren el
// emulador de Firestore en marcha (npm run test:rules lo levanta por ti).
const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ID = 'misalud-rules-test';
const ANA = 'ana';
const OTRO = 'otro';

let env: RulesTestEnvironment;

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules: readFileSync(resolve(__dirname, '../firestore.rules'), 'utf8'),
      host: '127.0.0.1',
      port: 8080,
    },
  });
});

afterAll(async () => env?.cleanup());
beforeEach(async () => env.clearFirestore());

const db = (uid: string) => env.authenticatedContext(uid).firestore();

describe('aislamiento por uid', () => {
  it('un usuario lee su propio perfil', async () => {
    await assertSucceeds(getDoc(doc(db(ANA), `usuarios/${ANA}/perfil/datos`)));
  });

  it('un usuario NO lee el árbol de otro', async () => {
    await assertFails(getDoc(doc(db(OTRO), `usuarios/${ANA}/pesos/2026-06-01`)));
  });

  it('un usuario NO escribe en el árbol de otro', async () => {
    await assertFails(
      setDoc(doc(db(OTRO), `usuarios/${ANA}/pesos/2026-06-01`), { fecha: '2026-06-01', peso: 65 }),
    );
  });

  it('el usuario anónimo no puede leer nada', async () => {
    const anon = env.unauthenticatedContext().firestore();
    await assertFails(getDoc(doc(anon, `usuarios/${ANA}/perfil/datos`)));
  });
});

describe('validación de pesos', () => {
  const ref = () => doc(db(ANA), `usuarios/${ANA}/pesos/2026-06-01`);

  it('acepta un peso válido con id de fecha correcto', async () => {
    await assertSucceeds(setDoc(ref(), { fecha: '2026-06-01', peso: 65.4, ts: 1 }));
  });

  it('rechaza peso fuera de rango (<= 30)', async () => {
    await assertFails(setDoc(ref(), { fecha: '2026-06-01', peso: 25 }));
  });

  it('rechaza peso fuera de rango (>= 200)', async () => {
    await assertFails(setDoc(ref(), { fecha: '2026-06-01', peso: 250 }));
  });

  it('rechaza un id de fecha mal formado', async () => {
    await assertFails(
      setDoc(doc(db(ANA), `usuarios/${ANA}/pesos/2026-6-3`), { fecha: '2026-6-3', peso: 65 }),
    );
  });

  it('permite borrar un registro propio', async () => {
    await setDoc(ref(), { fecha: '2026-06-01', peso: 65 });
    await assertSucceeds(deleteDoc(ref()));
  });
});

describe('validación de perfil', () => {
  const ref = () => doc(db(ANA), `usuarios/${ANA}/perfil/datos`);

  it('acepta el perfil con exactamente las claves permitidas', async () => {
    await assertSucceeds(
      setDoc(ref(), {
        nombre: 'Ana',
        alturaCm: 158.5,
        pesoInicial: 66.5,
        fechaInicio: '2026-06-03',
        objetivo: 60,
      }),
    );
  });

  it('rechaza el perfil con una clave extra', async () => {
    await assertFails(
      setDoc(ref(), {
        nombre: 'Ana',
        alturaCm: 158.5,
        pesoInicial: 66.5,
        fechaInicio: '2026-06-03',
        objetivo: 60,
        email: 'ana@example.com',
      }),
    );
  });
});

describe('días', () => {
  it('acepta un estado de día con id de fecha correcto', async () => {
    await assertSucceeds(
      setDoc(doc(db(ANA), `usuarios/${ANA}/dias/2026-06-01`), {
        fecha: '2026-06-01',
        hechas: { desayuno: true },
        entreno: false,
      }),
    );
  });

  it('rechaza un id de día mal formado', async () => {
    await assertFails(
      setDoc(doc(db(ANA), `usuarios/${ANA}/dias/junio-1`), { hechas: {}, entreno: false }),
    );
  });
});

describe('colecciones fuera del árbol de usuarios', () => {
  it('deniega cualquier ruta global', async () => {
    await assertFails(setDoc(doc(db(ANA), 'global/algo'), { x: 1 }));
  });
});
