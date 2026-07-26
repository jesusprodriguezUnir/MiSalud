import { describe, expect, it } from 'vitest';
import { escapar, fechaIcs, fechaIcsUtc, icsDia, icsPlan, veventsDieta } from './ics.calc';
import type { DiaDieta, DiaEntreno, Plan } from './plan.types';

const diaLunes: DiaDieta = {
  dia: 'Lunes',
  ingestas: {
    desayuno: { hora: '08:00', items: [{ n: 'Avena', c: '60 g' }] },
    cena: { hora: '', items: [{ n: 'Crema', receta: { ing: ['Puerro'], pasos: ['Hervir'] } }] },
  },
};

const entrenoLunes: DiaEntreno = {
  dia: 'Lunes',
  titulo: 'Fuerza A',
  duracion: '45 min',
  tipo: 'fuerza',
  bloques: [{ t: 'Bloque 1', e: ['Sentadilla', 'Remo'] }],
};

const AHORA = new Date('2026-07-26T10:15:30Z');

describe('fechaIcs', () => {
  it('formatea con componentes locales y sin sufijo de zona', () => {
    expect(fechaIcs(new Date('2026-03-09T00:00:00'), 8, 5)).toBe('20260309T080500');
  });

  it('rellena con ceros meses, días, horas y minutos', () => {
    expect(fechaIcs(new Date('2026-01-02T00:00:00'), 9, 0)).toBe('20260102T090000');
  });
});

describe('fechaIcsUtc', () => {
  it('emite UTC real con la Z (DTSTAMP del RFC 5545)', () => {
    expect(fechaIcsUtc(AHORA)).toBe('20260726T101530Z');
  });
});

describe('escapar', () => {
  it('escapa las comas, los puntos y coma, las barras y los saltos de línea', () => {
    expect(escapar('a, b; c\\d\ne')).toBe('a\\, b\\; c\\\\d\\ne');
  });
});

describe('veventsDieta', () => {
  it('sigue el orden de ingestas del dominio y omite las que faltan', () => {
    const evs = veventsDieta(new Date('2026-07-27T00:00:00'), diaLunes, { detallado: true });
    expect(evs.map((e) => e.uid)).toEqual([
      '2026-07-27-desayuno@misalud',
      '2026-07-27-cena@misalud',
    ]);
  });

  it('cae en la hora por defecto (21:00 en la cena) si el plan no trae hora', () => {
    const [, cena] = veventsDieta(new Date('2026-07-27T00:00:00'), diaLunes, { detallado: true });
    expect(cena.dtStart).toBe('20260727T210000');
    expect(cena.dtEnd).toBe('20260727T213000');
  });

  it('incluye ingredientes y pasos solo en modo detallado', () => {
    const fecha = new Date('2026-07-27T00:00:00');
    const [, conReceta] = veventsDieta(fecha, diaLunes, { detallado: true });
    const [, sinReceta] = veventsDieta(fecha, diaLunes, { detallado: false });
    expect(conReceta.description).toContain('Ingredientes: Puerro');
    expect(sinReceta.description).not.toContain('Ingredientes');
  });

  it('no desborda al día siguiente si la ingesta es a las 23:45', () => {
    const tarde: DiaDieta = {
      dia: 'Lunes',
      ingestas: { cena: { hora: '23:45', items: [{ n: 'Yogur' }] } },
    };
    const [ev] = veventsDieta(new Date('2026-07-27T00:00:00'), tarde, { detallado: true });
    expect(ev.dtEnd.startsWith('20260727T')).toBe(true);
  });
});

describe('icsDia', () => {
  const salida = icsDia('2026-07-27', diaLunes, entrenoLunes, AHORA);

  it('produce un VCALENDAR bien formado con CRLF', () => {
    expect(salida.startsWith('BEGIN:VCALENDAR\r\n')).toBe(true);
    expect(salida.endsWith('\r\nEND:VCALENDAR')).toBe(true);
  });

  it('emite un DTSTAMP en UTC válido (una sola Z, al final)', () => {
    const stamps = [...salida.matchAll(/^DTSTAMP:(.+)$/gm)].map((m) => m[1]);
    expect(stamps.length).toBeGreaterThan(0);
    for (const s of stamps) expect(s).toMatch(/^\d{8}T\d{6}Z$/);
  });

  it('incluye el entrenamiento del día', () => {
    expect(salida).toContain('UID:2026-07-27-entreno@misalud');
  });
});

describe('icsPlan', () => {
  const plan: Plan = {
    version: 1,
    dieta: Array.from({ length: 7 }, (_, i) => ({ ...diaLunes, dia: `Día ${i + 1}` })),
    entreno: Array.from({ length: 7 }, () => entrenoLunes),
    habitos: [],
    objetivos: [],
  };

  it('usa la fecha local en los UID: no se desplaza un día en UTC+1/+2', () => {
    // Con `toISOString()` sobre la medianoche local del 1 de julio en España
    // el id salía como 2026-06-30, desalineado con su propio DTSTART.
    const salida = icsPlan(plan, '2026-07-01', AHORA);
    expect(salida).toContain('UID:2026-07-01-desayuno@misalud');
    expect(salida).not.toContain('UID:2026-06-30-desayuno@misalud');
  });

  it('el UID y el DTSTART de cada evento hablan del mismo día', () => {
    const salida = icsPlan(plan, '2026-07-01', AHORA);
    const bloques = salida.split('BEGIN:VEVENT').slice(1);
    expect(bloques.length).toBe(7 * 3); // 2 ingestas + 1 entreno por día
    for (const b of bloques) {
      const uid = /UID:(\d{4}-\d{2}-\d{2})/.exec(b)?.[1].replace(/-/g, '');
      const start = /DTSTART:(\d{8})/.exec(b)?.[1];
      expect(uid).toBe(start);
    }
  });

  it('cubre los siete días consecutivos', () => {
    const salida = icsPlan(plan, '2026-07-01', AHORA);
    for (let i = 1; i <= 7; i++) {
      expect(salida).toContain(`UID:2026-07-0${i}-desayuno@misalud`);
    }
  });
});
