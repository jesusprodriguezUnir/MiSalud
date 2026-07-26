import { defineConfig } from 'vitest/config';

// Vitest cubre la lógica pura del dominio (cálculos y agregaciones) y las
// reglas de Firestore. No arranca componentes de Angular: esos, si hicieran
// falta, irían por el runner de Angular. Aquí buscamos tests rápidos y sin DOM.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/app/domain/**/*.spec.ts'],
    globals: false,
    reporters: process.env.CI ? ['default', 'junit'] : ['default'],
    outputFile: { junit: 'reports/junit-domain.xml' },
    coverage: {
      provider: 'v8',
      include: ['src/app/domain/**/*.ts'],
      // El seed son 750 líneas de datos: medir su cobertura no dice nada.
      exclude: ['src/app/domain/plan.seed.ts', 'src/app/domain/**/*.spec.ts'],
      reporter: ['text-summary', 'lcov'],
      // Umbrales por debajo de lo que hay hoy: son una red contra regresiones,
      // no un objetivo que perseguir subiendo el número cada vez que sube.
      thresholds: { lines: 80, functions: 80, branches: 75, statements: 80 },
    },
  },
});
