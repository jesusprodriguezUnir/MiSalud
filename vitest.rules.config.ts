import { defineConfig } from 'vitest/config';

// Config aparte para los tests de reglas de Firestore. Se ejecutan contra el
// emulador (npm run test:rules los arranca con firebase emulators:exec), por
// eso van separados de los tests de lógica pura, que no necesitan emulador.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.spec.ts'],
    globals: false,
    testTimeout: 20000,
    hookTimeout: 20000,
  },
});
