import { describe, it, expect } from 'vitest';
import { mediaMovil, ritmoSemanal, escalaChart } from './peso.calc';
import type { Peso } from './plan.types';

const p = (fecha: string, peso: number): Peso => ({ fecha, peso });

describe('mediaMovil', () => {
  it('el primer punto es igual al propio peso', () => {
    const mm = mediaMovil([p('2026-06-01', 66)]);
    expect(mm[0].peso).toBe(66);
  });

  it('promedia por ventana de 7 días reales, no por número de registros', () => {
    const pesos = [p('2026-06-01', 66), p('2026-06-03', 64)];
    const mm = mediaMovil(pesos);
    // ambos caen dentro de 7 días → media de los dos
    expect(mm[1].peso).toBe(65);
  });

  it('excluye registros fuera de la ventana de 7 días', () => {
    const pesos = [p('2026-06-01', 66), p('2026-06-10', 60)];
    const mm = mediaMovil(pesos);
    // 9 días de separación → el segundo punto solo se promedia consigo mismo
    expect(mm[1].peso).toBe(60);
  });
});

describe('ritmoSemanal', () => {
  it('devuelve null con muy pocos puntos', () => {
    expect(ritmoSemanal(mediaMovil([p('2026-06-01', 66), p('2026-06-02', 65)]))).toBeNull();
  });

  it('devuelve null si el span es menor de 7 días', () => {
    const mm = mediaMovil([
      p('2026-06-01', 66),
      p('2026-06-02', 65.8),
      p('2026-06-03', 65.6),
      p('2026-06-04', 65.4),
    ]);
    expect(ritmoSemanal(mm)).toBeNull();
  });

  it('calcula kg/semana negativos cuando el peso baja', () => {
    const mm = mediaMovil([
      p('2026-06-01', 66),
      p('2026-06-08', 65),
      p('2026-06-15', 64),
      p('2026-06-22', 63),
    ]);
    const r = ritmoSemanal(mm);
    expect(r).not.toBeNull();
    expect(r!).toBeLessThan(0);
  });
});

describe('escalaChart', () => {
  it('devuelve null con menos de dos registros', () => {
    expect(escalaChart([p('2026-06-01', 66)])).toBeNull();
  });

  it('genera escalas y ticks con dos registros', () => {
    const esc = escalaChart([p('2026-06-01', 66), p('2026-06-08', 64)], 60);
    expect(esc).not.toBeNull();
    expect(esc!.ticks.length).toBe(5);
    // el objetivo (60) queda dentro del rango con el padding
    expect(esc!.min).toBeLessThan(60);
    expect(esc!.max).toBeGreaterThan(66);
  });
});
