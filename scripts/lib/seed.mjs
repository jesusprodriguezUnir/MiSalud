// Carga de `src/app/domain/plan.seed.ts` desde Node, sin paso de build previo:
// se transpila en memoria y se importa como módulo data: URL. Compartido por
// seed.mjs y fotos.mjs, que necesitan el mismo seed como única fuente de verdad.

import { readFileSync } from 'node:fs';
import ts from 'typescript';

const RUTA_SEED = './src/app/domain/plan.seed.ts';

export async function cargarPlanSeed() {
  let tsCode;
  try {
    tsCode = readFileSync(RUTA_SEED, 'utf8');
  } catch (e) {
    console.error(
      `No se pudo leer ${RUTA_SEED} (${e.code}). Ejecuta el script desde la raíz del repositorio.`,
    );
    process.exit(1);
  }

  const jsCode = ts.transpileModule(tsCode, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ESNext },
  }).outputText;

  return import(`data:text/javascript;base64,${Buffer.from(jsCode).toString('base64')}`);
}
