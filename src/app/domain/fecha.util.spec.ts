import { describe, it, expect } from 'vitest';
import { iso, idxDia, num } from './fecha.util';

describe('iso', () => {
  it('formatea con ceros a la izquierda', () => {
    expect(iso(new Date(2026, 5, 3))).toBe('2026-06-03'); // mes 5 = junio
  });

  it('usa la fecha local, no UTC', () => {
    // 31 de diciembre por la noche no debe saltar al año siguiente
    expect(iso(new Date(2026, 11, 31, 23, 0))).toBe('2026-12-31');
  });
});

describe('idxDia', () => {
  it('lunes es 0 y domingo es 6', () => {
    expect(idxDia(new Date(2026, 5, 1))).toBe(0); // 1 jun 2026 = lunes
    expect(idxDia(new Date(2026, 5, 7))).toBe(6); // 7 jun 2026 = domingo
  });
});

describe('num', () => {
  it('redondea a un decimal', () => {
    expect(num(65.44)).toBe(65.4);
    expect(num(65.45)).toBe(65.5);
  });
});
