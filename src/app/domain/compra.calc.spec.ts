import { describe, it, expect } from 'vitest';
import { agregarCompra, categoria } from './compra.calc';
import { DIETA } from './plan.seed';
import type { DiaDieta } from './plan.types';

/** Un día suelto con una sola ingesta, para aislar el comportamiento medido. */
function unDia(items: { n: string; c?: string }[]): DiaDieta {
  return { dia: 'Lunes', ingestas: { comida: { hora: '14:00', items } } };
}

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

// El flag `aproximado` es la lógica menos evidente del módulo: marca los ítems
// cuyo total no se puede dar por bueno porque al menos una de las apariciones
// venía sin gramaje ("1 pieza", "al gusto"). La lista lo pinta como "120 g +".
describe('agregarCompra · flag aproximado', () => {
  it('no marca nada si todas las cantidades traen gramos', () => {
    const [g] = agregarCompra([unDia([{ n: 'Pan', c: '40 g' }])], new Set([0]));
    expect(g.items[0]).toMatchObject({ g: 40, veces: 1, aproximado: false });
  });

  it('marca el ítem cuya cantidad no lleva gramos', () => {
    const [g] = agregarCompra([unDia([{ n: 'Naranja', c: '1 pieza' }])], new Set([0]));
    expect(g.items[0]).toMatchObject({ g: 0, veces: 1, aproximado: true });
  });

  it('marca el ítem sin cantidad ninguna', () => {
    const [g] = agregarCompra([unDia([{ n: 'Naranja' }])], new Set([0]));
    expect(g.items[0].aproximado).toBe(true);
  });

  it('basta una aparición sin gramos para marcar el total, aunque haya otras con gramos', () => {
    const [g] = agregarCompra(
      [
        unDia([
          { n: 'Pan', c: '40 g' },
          { n: 'Pan', c: 'una rebanada' },
        ]),
      ],
      new Set([0]),
    );
    expect(g.items[0]).toMatchObject({ g: 40, veces: 2, aproximado: true });
  });

  it('acepta gramajes con coma decimal', () => {
    const [g] = agregarCompra([unDia([{ n: 'Pan', c: '12,5 g (1 rebanada)' }])], new Set([0]));
    expect(g.items[0]).toMatchObject({ g: 12.5, aproximado: false });
  });

  it('agrupa el mismo nombre sin distinguir mayúsculas ni espacios de más', () => {
    const [g] = agregarCompra(
      [
        unDia([
          { n: 'Pan  integral', c: '40 g' },
          { n: 'pan integral', c: '30 g' },
        ]),
      ],
      new Set([0]),
    );
    expect(g.items).toHaveLength(1);
    expect(g.items[0]).toMatchObject({ g: 70, veces: 2 });
  });
});
