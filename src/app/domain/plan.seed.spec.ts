// ---------------------------------------------------------------------------
// Integridad estructural del seed.
//
// `plan.seed.ts` es el activo más frágil del proyecto: ~750 líneas transcritas a
// mano del informe del dietista, y es lo que se escribe tal cual en Firestore la
// primera vez. Un día con seis comidas, una hora mal escrita o una clave de
// ingesta inventada solo se detectaría en runtime — o directamente en los datos
// del usuario. Estos tests no juzgan el contenido nutricional, solo la forma.
// ---------------------------------------------------------------------------

import { describe, expect, it } from 'vitest';
import { DIETA, ENTRENO, HABITOS, OBJETIVOS, PLAN_VERSION } from './plan.seed';
import { NOMBRE_DIA } from './plan.edit';
import { ORDEN_INGESTAS } from './plan.types';
import type { IngestaKey } from './plan.types';

const HORA = /^([01]\d|2[0-3]):[0-5]\d$/;
const CLAVES = new Set<string>(ORDEN_INGESTAS);

describe('PLAN_VERSION', () => {
  it('es un entero positivo', () => {
    expect(Number.isInteger(PLAN_VERSION)).toBe(true);
    expect(PLAN_VERSION).toBeGreaterThan(0);
  });
});

describe('DIETA', () => {
  it('tiene exactamente siete días, de lunes a domingo y en ese orden', () => {
    expect(DIETA).toHaveLength(7);
    expect(DIETA.map((d) => d.dia)).toEqual([...NOMBRE_DIA]);
  });

  it('no usa ninguna clave de ingesta fuera del dominio', () => {
    for (const dia of DIETA) {
      for (const clave of Object.keys(dia.ingestas)) {
        expect(CLAVES.has(clave), `${dia.dia}: clave "${clave}"`).toBe(true);
      }
    }
  });

  it('cada día tiene al menos una ingesta', () => {
    for (const dia of DIETA) {
      expect(Object.keys(dia.ingestas).length, dia.dia).toBeGreaterThan(0);
    }
  });

  it('todas las horas están en formato HH:MM válido', () => {
    for (const dia of DIETA) {
      for (const [clave, ingesta] of Object.entries(dia.ingestas)) {
        expect(ingesta?.hora, `${dia.dia}/${clave}`).toMatch(HORA);
      }
    }
  });

  it('las ingestas de un día van en orden cronológico creciente', () => {
    for (const dia of DIETA) {
      const horas = ORDEN_INGESTAS.filter((k) => dia.ingestas[k]).map((k) => dia.ingestas[k]!.hora);
      expect([...horas].sort(), dia.dia).toEqual(horas);
    }
  });

  it('ninguna ingesta se queda sin ítems', () => {
    for (const dia of DIETA) {
      for (const [clave, ingesta] of Object.entries(dia.ingestas)) {
        expect(ingesta?.items.length, `${dia.dia}/${clave}`).toBeGreaterThan(0);
      }
    }
  });

  it('todos los ítems tienen nombre no vacío', () => {
    for (const dia of DIETA) {
      for (const ingesta of Object.values(dia.ingestas)) {
        for (const item of ingesta?.items ?? []) {
          expect(item.n.trim().length, `${dia.dia}: ítem sin nombre`).toBeGreaterThan(0);
        }
      }
    }
  });

  it('ningún ítem lleva a la vez receta y cantidad (unión discriminada)', () => {
    for (const dia of DIETA) {
      for (const ingesta of Object.values(dia.ingestas)) {
        for (const item of ingesta?.items ?? []) {
          const conAmbos = item.receta !== undefined && item.c !== undefined;
          expect(conAmbos, `${dia.dia}: ${item.n}`).toBe(false);
        }
      }
    }
  });

  it('las recetas traen ingredientes y pasos, sin líneas en blanco', () => {
    for (const dia of DIETA) {
      for (const ingesta of Object.values(dia.ingestas)) {
        for (const item of ingesta?.items ?? []) {
          if (!item.receta) continue;
          expect(item.receta.ing.length, `${dia.dia}: ${item.n}`).toBeGreaterThan(0);
          expect(item.receta.pasos.length, `${dia.dia}: ${item.n}`).toBeGreaterThan(0);
          for (const linea of [...item.receta.ing, ...item.receta.pasos]) {
            expect(linea.trim().length, `${dia.dia}: ${item.n}`).toBeGreaterThan(0);
          }
        }
      }
    }
  });

  it('las fotos de receta son URLs http(s)', () => {
    for (const dia of DIETA) {
      for (const ingesta of Object.values(dia.ingestas)) {
        for (const item of ingesta?.items ?? []) {
          const url = item.receta?.fotoUrl;
          if (url) expect(url, `${dia.dia}: ${item.n}`).toMatch(/^https?:\/\//);
        }
      }
    }
  });

  it('el mismo plato no tiene dos fotos distintas (el backfill empareja por nombre)', () => {
    const fotos = new Map<string, string>();
    for (const dia of DIETA) {
      for (const ingesta of Object.values(dia.ingestas)) {
        for (const item of ingesta?.items ?? []) {
          const url = item.receta?.fotoUrl;
          if (!url) continue;
          const previa = fotos.get(item.n);
          if (previa) expect(url, item.n).toBe(previa);
          else fotos.set(item.n, url);
        }
      }
    }
  });
});

describe('ENTRENO', () => {
  it('tiene siete días alineados con los de la dieta', () => {
    expect(ENTRENO).toHaveLength(7);
    expect(ENTRENO.map((e) => e.dia)).toEqual([...NOMBRE_DIA]);
  });

  it('cada día tiene título, duración y un tipo conocido', () => {
    for (const e of ENTRENO) {
      expect(e.titulo.trim().length, e.dia).toBeGreaterThan(0);
      expect(e.duracion.trim().length, e.dia).toBeGreaterThan(0);
      expect(['fuerza', 'movilidad', 'cardio']).toContain(e.tipo);
    }
  });

  it('los bloques tienen título y al menos un ejercicio', () => {
    for (const e of ENTRENO) {
      expect(e.bloques.length, e.dia).toBeGreaterThan(0);
      for (const b of e.bloques) {
        expect(b.t.trim().length, `${e.dia}: bloque sin título`).toBeGreaterThan(0);
        expect(b.e.length, `${e.dia}/${b.t}`).toBeGreaterThan(0);
        for (const x of b.e) expect(x.trim().length, `${e.dia}/${b.t}`).toBeGreaterThan(0);
      }
    }
  });
});

describe('HABITOS y OBJETIVOS', () => {
  it('todos tienen título y descripción con texto', () => {
    for (const x of [...HABITOS, ...OBJETIVOS]) {
      expect(x.t.trim().length).toBeGreaterThan(0);
      expect(x.d.trim().length).toBeGreaterThan(0);
    }
  });

  it('no hay títulos repetidos (la vista Hoy los usa como track)', () => {
    const titulos = HABITOS.map((h) => h.t);
    expect(new Set(titulos).size).toBe(titulos.length);
  });
});

describe('cobertura de ingestas', () => {
  it('todas las claves del dominio aparecen en algún día del plan', () => {
    const usadas = new Set<IngestaKey>();
    for (const dia of DIETA) {
      for (const k of Object.keys(dia.ingestas) as IngestaKey[]) usadas.add(k);
    }
    expect([...usadas].sort()).toEqual([...ORDEN_INGESTAS].sort());
  });
});
