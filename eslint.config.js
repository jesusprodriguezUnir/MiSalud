// @ts-check
const eslint = require("@eslint/js");
const { defineConfig } = require("eslint/config");
const tseslint = require("typescript-eslint");
const angular = require("angular-eslint");

// `strictTypeChecked` en vez de `recommended`: es lo que activa reglas con
// información de tipos, y en particular `no-floating-promises`, clave en un
// código lleno de `onSnapshot` y `async`. El código ya estaba limpio (0 `any`,
// 0 `==`), así que endurecer aquí no arrastra deuda: solo evita que vuelva.
module.exports = defineConfig([
  {
    files: ["**/*.ts"],
    extends: [
      eslint.configs.recommended,
      tseslint.configs.strictTypeChecked,
      tseslint.configs.stylistic,
      angular.configs.tsRecommended,
    ],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: __dirname,
      },
    },
    processor: angular.processInlineTemplates,
    rules: {
      eqeqeq: ["error", "always", { null: "ignore" }],
      "@typescript-eslint/no-explicit-any": "error",
      "@angular-eslint/directive-selector": [
        "error",
        {
          type: "attribute",
          prefix: "app",
          style: "camelCase",
        },
      ],
      "@angular-eslint/component-selector": [
        "error",
        {
          type: "element",
          prefix: "app",
          style: "kebab-case",
        },
      ],
      // Ya se cumple al 100%; la regla lo blinda.
      "@angular-eslint/prefer-on-push-component-change-detection": "error",
      // El proyecto usa `!` sobre índices que la plantilla ya ha comprobado con
      // un @if; prohibirlo obligaría a duplicar guardas sin ganar seguridad.
      "@typescript-eslint/no-non-null-assertion": "off",

      // --- reglas de strictTypeChecked que se desactivan a propósito ---
      // Interpolar un número en una plantilla de texto (mensajes de error,
      // aria-labels) es exactamente lo que se quiere aquí; obligar a `String(n)`
      // solo añadiría ruido.
      "@typescript-eslint/restrict-template-expressions": [
        "error",
        { allowNumber: true, allowBoolean: false, allowNullish: false },
      ],
      // `(click)="metodoQueDevuelveVoid()"` y `effect(() => guardar(...))` son
      // el idioma normal en Angular; envolverlos en llaves no aporta claridad.
      "@typescript-eslint/no-confusing-void-expression": "off",
      // `tsconfig` no activa `noUncheckedIndexedAccess`, así que TypeScript cree
      // que `array[i]` nunca es undefined y la regla marca como innecesarias
      // guardas que sí lo son en tiempo de ejecución (plan.dieta[i] con un plan
      // a medio sembrar, por ejemplo). Con esa premisa falsa hace más mal que
      // bien: sus avisos aquí son falsos positivos.
      "@typescript-eslint/no-unnecessary-condition": "off",
      // `output<void>()` es la forma canónica de un evento sin carga.
      "@typescript-eslint/no-invalid-void-type": "off",
      "@typescript-eslint/no-unnecessary-type-arguments": "off",
      // Borrar una ingesta del mapa por su clave es justo lo que hace el editor.
      "@typescript-eslint/no-dynamic-delete": "off",
      // Un componente sin estado (el raíz, que solo monta el router-outlet) es
      // una clase vacía legítima en Angular, no un namespace disfrazado.
      "@typescript-eslint/no-extraneous-class": "off",
    },
  },
  {
    // Los specs comparan y desestructuran con más libertad que el código de app.
    files: ["**/*.spec.ts"],
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        { varsIgnorePattern: "^_", argsIgnorePattern: "^_" },
      ],
    },
  },
  {
    files: ["**/*.html"],
    extends: [
      angular.configs.templateRecommended,
      angular.configs.templateAccessibility,
    ],
    rules: {},
  },
]);
