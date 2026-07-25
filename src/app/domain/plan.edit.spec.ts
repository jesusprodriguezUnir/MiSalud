import { describe, it, expect } from 'vitest';
import {
  aLineas,
  aTexto,
  completar,
  conReceta,
  limpiar,
  mover,
  quitar,
  reemplazar,
} from './plan.edit';
import type { Item, Plan } from './plan.types';

const planBase = (): Plan => ({
  version: 1,
  dieta: [],
  entreno: [],
  habitos: [],
  objetivos: [],
});

describe('listas', () => {
  it('reemplaza sin mutar el original', () => {
    const a = [1, 2, 3];
    expect(reemplazar(a, 1, 9)).toEqual([1, 9, 3]);
    expect(a).toEqual([1, 2, 3]);
  });

  it('quita por índice', () => {
    expect(quitar(['a', 'b', 'c'], 1)).toEqual(['a', 'c']);
  });

  it('mueve un elemento arriba y abajo', () => {
    expect(mover([1, 2, 3], 2, -1)).toEqual([1, 3, 2]);
    expect(mover([1, 2, 3], 0, 1)).toEqual([2, 1, 3]);
  });

  it('no mueve fuera de los límites', () => {
    expect(mover([1, 2, 3], 0, -1)).toEqual([1, 2, 3]);
    expect(mover([1, 2, 3], 2, 1)).toEqual([1, 2, 3]);
  });
});

describe('texto multilínea', () => {
  it('convierte a texto y vuelve, descartando líneas en blanco', () => {
    expect(aTexto(['uno', 'dos'])).toBe('uno\ndos');
    expect(aLineas('uno\n\n  dos  \n')).toEqual(['uno', 'dos']);
  });

  it('trata la lista ausente como texto vacío', () => {
    expect(aTexto(undefined)).toBe('');
  });
});

describe('conReceta', () => {
  it('al activar la receta descarta la cantidad', () => {
    const item: Item = { n: 'Ensalada', c: '200 g' };
    const con = conReceta(item, true);
    expect(con.receta).toEqual({ ing: [], pasos: [] });
    expect(con.c).toBeUndefined();
  });

  it('al desactivarla descarta la receta y conserva el nombre', () => {
    const item: Item = { n: 'Ensalada', receta: { ing: ['Tomate'], pasos: ['Cortar'] } };
    const sin = conReceta(item, false);
    expect(sin.receta).toBeUndefined();
    expect(sin.n).toBe('Ensalada');
  });

  it('conserva la receta ya escrita si se vuelve a activar sobre el mismo objeto', () => {
    const item: Item = { n: 'Sopa', receta: { ing: ['Agua'], pasos: [] } };
    expect(conReceta(item, true).receta?.ing).toEqual(['Agua']);
  });
});

describe('limpiar', () => {
  it('no deja ninguna clave con valor undefined (Firestore las rechaza)', () => {
    const plan: Plan = {
      ...planBase(),
      dieta: [
        {
          dia: 'Lunes',
          fotoUrl: '   ',
          ingestas: {
            comida: { hora: '14:00', items: [{ n: 'Arroz', c: '', nota: '' }] },
          },
        },
      ],
    };
    const limpio = limpiar(plan);
    const item = limpio.dieta[0].ingestas.comida!.items[0];
    expect(Object.keys(limpio.dieta[0])).not.toContain('fotoUrl');
    expect(Object.keys(item)).toEqual(['n']);
    expect(JSON.stringify(limpio)).not.toContain('undefined');
  });

  it('descarta los ítems que se añadieron y nunca se rellenaron', () => {
    const plan: Plan = {
      ...planBase(),
      dieta: [
        {
          dia: 'Lunes',
          ingestas: {
            cena: {
              hora: '21:00',
              items: [{ n: 'Merluza', c: '150 g' }, { n: '  ' }],
            },
          },
        },
      ],
    };
    expect(limpiar(plan).dieta[0].ingestas.cena!.items).toHaveLength(1);
  });

  it('recorta hábitos y objetivos y elimina los vacíos', () => {
    const plan: Plan = {
      ...planBase(),
      habitos: [
        { t: '  Andar  ', d: ' 30 min ' },
        { t: '', d: '' },
      ],
      objetivos: [{ t: '', d: '' }],
    };
    const limpio = limpiar(plan);
    expect(limpio.habitos).toEqual([{ t: 'Andar', d: '30 min' }]);
    expect(limpio.objetivos).toEqual([]);
  });

  it('conserva entrenoFuerte solo cuando es true', () => {
    const plan: Plan = {
      ...planBase(),
      dieta: [
        { dia: 'Lunes', entrenoFuerte: true, ingestas: {} },
        { dia: 'Martes', entrenoFuerte: false, ingestas: {} },
      ],
    };
    const limpio = limpiar(plan);
    expect(limpio.dieta[0].entrenoFuerte).toBe(true);
    expect(Object.keys(limpio.dieta[1])).not.toContain('entrenoFuerte');
  });

  it('limpia los bloques de entrenamiento sin dejar ejercicios en blanco', () => {
    const plan: Plan = {
      ...planBase(),
      entreno: [
        {
          dia: 'Lunes',
          titulo: ' Fuerza ',
          duracion: '45 min',
          tipo: 'fuerza',
          bloques: [{ t: 'Serie A', e: ['Sentadilla', '  ', 'Remo'] }],
          claves: [],
        },
      ],
    };
    const limpio = limpiar(plan);
    expect(limpio.entreno[0].titulo).toBe('Fuerza');
    expect(limpio.entreno[0].bloques[0].e).toEqual(['Sentadilla', 'Remo']);
    expect(Object.keys(limpio.entreno[0])).not.toContain('claves');
  });
});

describe('completar', () => {
  it('rellena los siete días de dieta y entreno que el editor indexa', () => {
    const p = completar(planBase());
    expect(p.dieta).toHaveLength(7);
    expect(p.entreno).toHaveLength(7);
    expect(p.dieta[2].dia).toBe('Miércoles');
    expect(p.entreno[6].dia).toBe('Domingo');
  });

  it('respeta los días que ya venían del plan', () => {
    const plan: Plan = { ...planBase(), dieta: [{ dia: 'Lunes', ingestas: {} }] };
    expect(completar(plan).dieta[0].ingestas).toEqual({});
    expect(completar(plan).dieta).toHaveLength(7);
  });
});
