import { describe, it, expect } from 'vitest';
import { agregarCompra, categoria } from './compra.calc';
import { DIETA } from './plan.seed';

describe('categoria', () => {
  it('clasifica por las regex fijas', () => {
    expect(categoria('Naranja')).toBe('Fruta');
    expect(categoria('Judía verde')).toBe('Verdura y hortaliza');
    expect(categoria('Atún en aceite')).toBe('Pescado y conservas');
    expect(categoria('Jamón serrano')).toBe('Carne y fiambre');
    expect(categoria('Yogur bio cremoso')).toBe('Huevos y lácteos');
    expect(categoria('Almendra sin cáscara')).toBe('Frutos secos y semillas');
    expect(categoria('Pan integral de trigo')).toBe('Despensa');
    expect(categoria('Algo raro')).toBe('Otros');
  });
});

describe('agregarCompra', () => {
  it('sin días seleccionados no devuelve nada', () => {
    expect(agregarCompra(DIETA, new Set())).toHaveLength(0);
  });

  it('agrupa por categorías en el orden fijo', () => {
    const grupos = agregarCompra(DIETA, new Set([0, 1, 2, 3, 4, 5, 6]));
    const cats = grupos.map((g) => g.categoria);
    // el orden relativo se respeta
    expect(cats.indexOf('Fruta')).toBeLessThan(cats.indexOf('Despensa'));
    expect(cats).toContain('Pescado y conservas');
  });

  it('ignora agua y sal común', () => {
    const grupos = agregarCompra(DIETA, new Set([0, 1, 2, 3, 4, 5, 6]));
    const nombres = grupos.flatMap((g) => g.items.map((i) => i.n.toLowerCase()));
    expect(nombres).not.toContain('agua');
    expect(nombres).not.toContain('sal común');
  });

  it('suma los gramajes de ingredientes de receta del lunes', () => {
    const grupos = agregarCompra(DIETA, new Set([0]));
    const items = grupos.flatMap((g) => g.items);
    // el lunes lleva atún tanto en la ensalada de pasta (receta) como suelto
    const atun = items.find((i) => i.n.toLowerCase().startsWith('atún'));
    expect(atun).toBeDefined();
    expect(atun!.g).toBeGreaterThan(0);
  });

  it('acumula "veces" cuando un ítem se repite entre días', () => {
    // El aceite de oliva aparece en casi todas las ingestas de la semana.
    const grupos = agregarCompra(DIETA, new Set([0, 1, 2, 3, 4, 5, 6]));
    const items = grupos.flatMap((g) => g.items);
    const aceite = items.find((i) => i.n.toLowerCase() === 'aceite de oliva');
    expect(aceite).toBeDefined();
    expect(aceite!.veces).toBeGreaterThan(1);
    expect(aceite!.g).toBeGreaterThan(0);
  });
});
