import { defineConfig } from 'vitest/config';

// Vitest cubre la lógica pura del dominio (cálculos y agregaciones) y las
// reglas de Firestore. No arranca componentes de Angular: esos, si hicieran
// falta, irían por el runner de Angular. Aquí buscamos tests rápidos y sin DOM.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/app/domain/**/*.spec.ts'],
    globals: false,
  },
});
