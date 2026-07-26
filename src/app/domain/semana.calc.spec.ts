import { describe, expect, it } from 'vitest';
import { progresoDia, resumenCena, resumenComida, tituloCorto } from './semana.calc';
import type { DiaDieta, EstadoDia } from './plan.types';

const vacio: EstadoDia = { hechas: {}, entreno: false };

describe('resumenComida', () => {
  it('prefiere los platos con receta, que son los que dan nombre a la comida', () => {
    const d: DiaDieta = {
      dia: 'Lunes',
      ingestas: {
        comida: {
          hora: '14:00',
          items: [
            { n: 'Pan', c: '40 g' },
            { n: 'Ensalada de pasta', receta: { ing: [], pasos: [] } },
          ],
        },
      },
    };
    expect(resumenComida(d)).toBe('Ensalada de pasta');
  });

  it('cae en los primeros ítems sueltos si no hay recetas', () => {
    const d: DiaDieta = {
      dia: 'Lunes',
      ingestas: {
        comida: { hora: '14:00', items: [{ n: 'Pan' }, { n: 'Atún' }, { n: 'Fruta' }] },
      },
    };
    expect(resumenComida(d)).toBe('Pan · Atún');
  });

  it('devuelve cadena vacía si el día no tiene comida', () => {
    expect(resumenComida({ dia: 'Lunes', ingestas: {} })).toBe('');
  });
});

describe('resumenCena', () => {
  it('ignora el agua, que acompaña a todas las cenas y no informa', () => {
    const d: DiaDieta = {
      dia: 'Lunes',
      ingestas: { cena: { hora: '21:00', items: [{ n: 'Agua' }, { n: 'Tortilla' }] } },
    };
    expect(resumenCena(d)).toBe('Tortilla');
  });

  it('muestra hasta tres ítems sueltos', () => {
    const d: DiaDieta = {
      dia: 'Lunes',
      ingestas: {
        cena: { hora: '21:00', items: [{ n: 'A' }, { n: 'B' }, { n: 'C' }, { n: 'D' }] },
      },
    };
    expect(resumenCena(d)).toBe('A · B · C');
  });
});

describe('tituloCorto', () => {
  it('se queda con lo anterior al primer separador', () => {
    expect(tituloCorto('Fuerza A · tren superior')).toBe('Fuerza A');
    expect(tituloCorto('Descanso')).toBe('Descanso');
    expect(tituloCorto('')).toBe('');
  });
});

describe('progresoDia', () => {
  const conDos: DiaDieta = {
    dia: 'Lunes',
    ingestas: {
      desayuno: { hora: '08:30', items: [{ n: 'Avena' }] },
      cena: { hora: '21:00', items: [{ n: 'Tortilla' }] },
    },
  };

  it('cuenta una casilla por ingesta más una por el entrenamiento', () => {
    expect(progresoDia(conDos, vacio)).toEqual({ hechas: 0, total: 3, pct: 0 });
  });

  it('suma las ingestas marcadas y el entreno', () => {
    const estado: EstadoDia = { hechas: { desayuno: true }, entreno: true };
    expect(progresoDia(conDos, estado)).toEqual({ hechas: 2, total: 3, pct: 67 });
  });

  it('llega al 100 % con todo hecho', () => {
    const estado: EstadoDia = { hechas: { desayuno: true, cena: true }, entreno: true };
    expect(progresoDia(conDos, estado).pct).toBe(100);
  });

  it('un día sin ingestas sigue teniendo la casilla del entrenamiento', () => {
    expect(progresoDia({ dia: 'Lunes', ingestas: {} }, vacio)).toEqual({
      hechas: 0,
      total: 1,
      pct: 0,
    });
  });

  it('no explota con un día que el plan no trae', () => {
    expect(progresoDia(undefined, vacio).total).toBe(1);
  });
});
