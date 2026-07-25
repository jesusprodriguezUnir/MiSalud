import { describe, it, expect } from 'vitest';
import { fotoDelDia } from './foto.calc';
import type { DiaDieta, Receta } from './plan.types';

const receta = (fotoUrl?: string): Receta => ({ ing: ['Algo: 1 g'], pasos: ['Hacerlo'], fotoUrl });

const dia = (over: Partial<DiaDieta> = {}): DiaDieta => ({
  dia: 'Lunes',
  ingestas: {},
  ...over,
});

describe('fotoDelDia', () => {
  it('devuelve null sin día', () => {
    expect(fotoDelDia(undefined)).toBeNull();
  });

  it('devuelve null si no hay ninguna foto', () => {
    const d = dia({
      ingestas: { comida: { hora: '14:00', items: [{ n: 'Lentejas', receta: receta() }] } },
    });
    expect(fotoDelDia(d)).toBeNull();
  });

  it('toma la foto de la receta de la comida', () => {
    const d = dia({
      ingestas: {
        comida: { hora: '14:00', items: [{ n: 'Lentejas', receta: receta('/f/lentejas.jpg') }] },
      },
    });
    expect(fotoDelDia(d)).toEqual({ url: '/f/lentejas.jpg', titulo: 'Lentejas' });
  });

  it('prioriza la comida sobre la cena', () => {
    const d = dia({
      ingestas: {
        cena: { hora: '21:00', items: [{ n: 'Sopa', receta: receta('/f/sopa.jpg') }] },
        comida: { hora: '14:00', items: [{ n: 'Lentejas', receta: receta('/f/lentejas.jpg') }] },
      },
    });
    expect(fotoDelDia(d)?.url).toBe('/f/lentejas.jpg');
  });

  it('cae en la cena si la comida no tiene foto', () => {
    const d = dia({
      ingestas: {
        comida: { hora: '14:00', items: [{ n: 'Lentejas', receta: receta() }] },
        cena: { hora: '21:00', items: [{ n: 'Sopa', receta: receta('/f/sopa.jpg') }] },
      },
    });
    expect(fotoDelDia(d)).toEqual({ url: '/f/sopa.jpg', titulo: 'Sopa' });
  });

  it('ignora los ítems sin receta', () => {
    const d = dia({
      ingestas: {
        comida: {
          hora: '14:00',
          items: [
            { n: 'Pan', c: '40 g' },
            { n: 'Lentejas', receta: receta('/f/lentejas.jpg') },
          ],
        },
      },
    });
    expect(fotoDelDia(d)?.titulo).toBe('Lentejas');
  });

  it('la foto propia del día manda sobre la de la receta', () => {
    const d = dia({
      fotoUrl: '/f/dia.jpg',
      ingestas: {
        comida: { hora: '14:00', items: [{ n: 'Lentejas', receta: receta('/f/lentejas.jpg') }] },
      },
    });
    expect(fotoDelDia(d)).toEqual({ url: '/f/dia.jpg', titulo: 'Lentejas' });
  });

  it('usa la foto propia del día aunque no haya recetas', () => {
    const d = dia({ fotoUrl: '/f/dia.jpg' });
    expect(fotoDelDia(d)).toEqual({ url: '/f/dia.jpg', titulo: 'Lunes' });
  });
});
