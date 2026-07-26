# mejoraskimi — Análisis complementario (Kimi)

Análisis independiente del proyecto (Julio 2026). **Complementa a
[`MEJORAS.md`](MEJORAS.md), no lo duplica**: todo lo listado aquí son hallazgos
nuevos (bugs, seguridad, tooling y UX) que aquel documento no recoge. Cuando un
tema se solapa con una mejora ya existente, se indica con una referencia.

---

## 🔴 P0 — Seguridad

### 1. Service account JSON fuera de la raíz del repo

**Problema:** `misalud-133ef-firebase-adminsdk-fbsvc-474d4bda53.json` (clave
privada de Firebase Admin) vive en la raíz del proyecto. Verificado: **no está
trackeado en git ni nunca se commiteó** (`.gitignore:51` lo cubre), pero los
tres scripts lo buscan activamente en `./`, lo que incentiva dejarlo ahí.
Cualquier zip, backup o sync del directorio lo expone.

**Ubicación:**

- `scripts/seed.mjs:24-37`, `scripts/fotos.mjs:34-44`, `scripts/deploy-rules.mjs:17-29`
  — los tres escanean el directorio actual buscando el JSON.

**Mejora propuesta:**

- Mover el JSON fuera del repo (p. ej. `%USERPROFILE%\.config\misalud\sa.json`)
  y que los scripts lean solo `GOOGLE_APPLICATION_CREDENTIALS` o esa ruta fija.
- Si el archivo salió alguna vez del disco local (cloud sync, email, backup
  externo), **rotar la clave** en la consola de GCP.

**Esfuerzo:** Bajo

---

### 2. `seed.mjs` siembra en `usuarios/{email}/` si el usuario no existe

**Problema:** si `getUserByEmail` falla, el script solo hace `console.warn` y
**continúa con `uid = email`**, escribiendo `usuarios/{email}/perfil/datos` en
producción. `fotos.mjs:51-55` sí falla duro ante el mismo caso (inconsistente).

**Ubicación:** `scripts/seed.mjs:45-55`

**Mejora propuesta:**

- Abortar con `process.exit(1)` si el email no se resuelve a un uid real.
- De paso, corregir el mensaje confuso "Usuario encriptado/encontrado por
  email" (`seed.mjs:49`).

**Esfuerzo:** Trivial

---

## 🔴 P1 — Bugs funcionales y de datos

### 3. Hora de cena divergente: 20:00 vs 21:00

**Problema:** el mismo dato vive en dos constantes con valores distintos. El
ICS exportado puede citar la cena a una hora distinta de la que crea el editor
de Plan.

**Ubicación:**

- `src/app/core/export.service.ts:12-18` — `HORAS_DEFECTO.cena = '20:00'`
- `src/app/domain/plan.edit.ts:23-29` — `HORA_POR_DEFECTO.cena = '21:00'`

**Mejora propuesta:**

- Unificar en `src/app/domain/plan.types.ts` (junto a `ORDEN_INGESTAS`) con el
  valor correcto (21:00) e importar desde ambos sitios. Ver también #10.

**Esfuerzo:** Bajo

---

### 4. Logout no navega a `/login` ni limpia los datos en memoria

**Problema:** `shell.logout()` detiene los streams y hace `signOut`, pero nadie
navega a `/login` (el guard solo se evalúa al navegar) y `PlanService.plan/perfil`,
`PesoService.pesos` y `DiaService.cache` conservan los datos. Tras cerrar
sesión, la pantalla sigue mostrando los datos de salud hasta una navegación
manual. Problema de privacidad real aunque la app sea single-user.

**Ubicación:** `src/app/shell/shell.ts:62-67`

**Mejora propuesta:**

- Navegar a `/login` desde `logout()`.
- Limpiar signals: `plan.set(semilla)`, `perfil.set(null)`,
  `pesos.set([])`, `cache.set(new Map())` — o exponer un `reset()` por servicio.

**Esfuerzo:** Bajo

---

### 5. Si el plan falla al cargar, se pinta la semilla local como dato real

**Problema:** el camino de error de `escucharPlan`/`escucharPerfil` llama a
`listo()` → `cargando = false` → el shell muestra el outlet con la semilla
local. El propio comentario del shell dice que la semilla "no debe pintarse",
pero en error se pinta — y en una app de salud, mostrar datos que no son los
del usuario es grave (puede editar la semilla creyendo que es su plan).

**Ubicación:**

- `src/app/core/plan.service.ts:114-118, 153-157`
- `src/app/shell/shell.ts:41`

**Mejora propuesta:**

- Estado de error explícito en `PlanService` (signal `error`).
- El shell muestra pantalla de error con botón "Reintentar" en vez del outlet.
- Relacionado con MEJORAS.md #2 (ErrorService): el toast no basta aquí, hace
  falta bloquear la UI.

**Esfuerzo:** Medio

---

### 6. `export.service.ts`: bugs de fechas ICS y 180 líneas puras sin tests

**Problemas:**

- **Off-by-one UTC** (`:99`): `d.toISOString().split('T')[0]` sobre un `Date`
  construido como medianoche local devuelve el día anterior en UTC+1/+2
  (España): los `UID` de los VEVENT llevan la fecha desplazada respecto a
  `DTSTART`. `fecha.util.iso()` existe precisamente para evitar esto.
- **`DTSTAMP` inválido** (`:176`): se le añade `Z` (UTC) a una hora construida
  con componentes locales. Violación menor del RFC 5545.
- El bucle ingestas→VEVENT está **duplicado** entre `descargarIcsDia` y
  `descargarIcsPlan` (`:33` y `:105` repiten además el array de ingestas inline
  en vez de usar `ORDEN_INGESTAS`).
- ~180 líneas de generación ICS pura y testeable viviendo en un servicio
  Angular, sin un solo spec.

**Ubicación:** `src/app/core/export.service.ts` (completo)

**Mejora propuesta:**

- Extraer la generación ICS a `src/app/domain/ics.calc.ts` pura (recibe datos,
  devuelve string) con specs Vitest — los dos primeros bugs habrían saltado en
  un test. El DOM (`Blob`, `a.click()`) se queda en el servicio.
- Usar `ORDEN_INGESTAS` y `iso()` dentro de la lógica extraída.

**Esfuerzo:** Medio

---

### 7. El peso tecleado se pierde si falla la escritura

**Problema:** `pesoInput = ''` se ejecuta _antes_ del `await`; si `add()` falla,
el `catch` ya no puede recuperar lo que el usuario escribió.

**Ubicación:** `src/app/features/peso/peso.page.ts:81-87`

**Mejora propuesta:**

- Vaciar el input solo tras un `await` exitoso; en el `catch`, restaurarlo.
- De paso, deshabilitar el botón "Guardar" durante la escritura (evita doble
  tap; ver #25).

**Esfuerzo:** Bajo

---

### 8. Reglas Firestore: `data.fecha` no está atada al doc id (+ stream de pesos sin reintento)

**Problema (reglas):** `firestore.rules` valida el formato del _id_ pero no que
`request.resource.data.fecha == fecha`. Un write con id y fecha distintos
desordena el `orderBy('fecha')` de `PesoService` (el chart y la media móvil
asumen orden). Además `dias/{fecha}` no valida la forma del documento: `hechas`
podría traer claves arbitrarias (el tipo `EstadoDia` solo admite 5).

**Problema (stream):** si el `onSnapshot` de pesos entra en el callback de
error (p. ej. `permission-denied` al expirar el token), el listener queda
destruido y no hay reintento: la app muestra pesos congelados hasta recargar.

**Ubicación:**

- `firestore.rules:41-55`
- `src/app/core/peso.service.ts:73-76`

**Mejora propuesta:**

- Añadir `&& request.resource.data.fecha == fecha` a `pesos` (y análogo en
  `dias`), más `hasOnly(['fecha','peso','ts'])`; cubrir con tests en
  `tests/firestore.rules.spec.ts`.
- En el callback de error del stream, reintentar (p. ej. re-`escuchar()` tras
  un backoff corto) o al menos ofrecer "Reintentar" en la UI.

**Esfuerzo:** Bajo (reglas) + Medio (reintento)

---

## 🟡 P2 — Calidad de código y tooling

### 9. Constantes de validación duplicadas entre UI y rules

**Problema:** el rango de peso 30–200 está hardcodeado en 3 sitios; lo mismo
aplica a la altura. Si cambia, hay que tocar código y rules a la vez sin nada
que lo recuerde.

**Ubicación:**

- `src/app/features/peso/peso.page.ts:76`
- `src/app/features/ajustes/ajustes.page.ts:49-54`
- `firestore.rules:45-46`

**Mejora propuesta:**

- `PESO_MIN/MAX`, `ALTURA_MIN/MAX` en `domain/plan.types.ts`, usadas por las
  páginas, con un comentario en `firestore.rules` apuntando a ellas (las rules
  no pueden importar, pero el comentario sí evita el desfase).
- `PesoService.add()` debería validar también: hoy depende solo de UI + rules.

**Esfuerzo:** Bajo

---

### 10. `NOMBRE_INGESTA` triplicado

**Problema:** tres copias literales del mismo `Record<IngestaKey, string>`.

**Ubicación:**

- `src/app/features/plan/plan.page.ts:45-51`
- `src/app/features/hoy/hoy.page.ts:14-20`
- `src/app/core/export.service.ts:4-10`

**Mejora propuesta:** mover a `domain/plan.types.ts` junto a `ORDEN_INGESTAS`
(mismo patrón que MEJORAS.md #10, ya hecho) e importar. Aprovechar el mismo
cambio para #3.

**Esfuerzo:** Bajo

---

### 11. `sucio` hace `JSON.stringify` del plan entero por cada tecla

**Problema:** cada pulsación en el editor de Plan dispara 2 stringifies del
plan completo (~740 líneas de seed) + 2 `limpiar`. Se nota en ediciones largas
en móvil.

**Ubicación:** `src/app/features/plan/plan.page.ts:88-92`

**Mejora propuesta:** flag `sucio` que se active en cada método `set*` (ya hay
~30 puntos de mutación centralizados en la página, es un cambio barato) en vez
de comparar snapshots.

**Esfuerzo:** Medio

---

### 12. ESLint: endurecer reglas (hoy pasaría en verde)

**Problema:** la config usa `recommended` + `stylistic` + `templateAccessibility`,
pero no `strict-type-checked` (no detecta `no-floating-promises`, clave con
tanto `onSnapshot`/async), ni `eqeqeq`, ni `no-explicit-any` explícito. El
código actual está limpio (0 ocurrencias de `any`/`==`), así que endurecer
ahora cuesta cero y blinda el estado.

**Ubicación:** `eslint.config.js:10-15`

**Mejora propuesta:**

- Añadir `tseslint.configs.strictTypeChecked`, `eqeqeq: 'error'`,
  `@typescript-eslint/no-explicit-any: 'error'`.
- Opcional: `prefer-on-push-component-change-detection` (ya se cumple al 100%).

**Esfuerzo:** Bajo

---

### 13. CI: doble build, sin concurrency ni audit, y contradicción con CLAUDE.md

**Problemas:**

- `build-test` y `deploy` compilan por separado (`ci.yml:41` y `:54`); no se
  reutiliza `dist/` vía artifacts.
- Sin `concurrency`: pushes rápidos a `main` solapan despliegues.
- Sin auditoría de dependencias (`npm audit`) ni Dependabot/Renovate.
- **Contradicción:** `ci.yml:63` usa `firebase deploy --only firestore:rules,hosting`
  directamente, pero CLAUDE.md afirma que esa vía falla por falta de
  `serviceusage.services.get` y que por eso existe `scripts/deploy-rules.mjs`.
  O el SA de CI es distinto, o el deploy de rules en CI está roto/silencioso.

**Ubicación:** `.github/workflows/ci.yml:41, 54, 63`

**Mejora propuesta:**

- Subir `dist/` como artifact en `build-test` y descargarlo en `deploy`.
- `concurrency: deploy-${{ github.ref }}` con `cancel-in-progress: false`.
- `npm audit --audit-level=high` como paso informativo.
- Verificar cuál es la vía real de deploy de rules en CI y alinear
  workflow + CLAUDE.md.

**Esfuerzo:** Bajo

---

### 14. `scripts/`: duplicación triple de infraestructura

**Problema:** `findServiceAccount`, `loadPlanSeed` y la resolución de
`projectId` están copiados en los tres scripts. Además no hay `try/catch` alrededor
de las escrituras: un fallo deja stack trace sin contexto.

**Ubicación:**

- `scripts/seed.mjs:24-37, 58-65`
- `scripts/fotos.mjs:34-44, 59-65`
- `scripts/deploy-rules.mjs:17-29`

**Mejora propuesta:** extraer `scripts/lib/` (credenciales + carga del seed)
y envolver las escrituras con mensajes de error accionables. Hacerlo junto con
#1 y #2 (mismo código).

**Esfuerzo:** Bajo

---

### 15. Test de integridad del seed (749 líneas sin red de seguridad)

**Problema:** `plan.seed.ts` es el activo más frágil del proyecto (7 días ×
comidas × ítems, editado a mano) y no tiene ningún test. Un día con 6 comidas
o una hora mal formateada solo se detectaría en runtime — o peor, en los datos
del usuario.

**Ubicación:** `src/app/domain/plan.seed.ts`

**Mejora propuesta:** spec que valide estructuralmente el seed: exactamente 7
días, horas `HH:MM` válidas, `IngestaKey` conocidas, ítems con nombre no vacío,
habitos/objetivos con texto. Complemento barato: specs del flag `aproximado`
de `compra.calc` (lógica no trivial sin test) y de ingestas vacías en
`limpiar` (#16).

**Esfuerzo:** Bajo

---

### 16. `limpiarDiaDieta` conserva ingestas con `items: []`

**Problema:** una ingesta cuyos ítems se borran todos queda como
`{ hora, items: [] }`: se guarda en Firestore y se pinta como sección vacía en
Hoy. La barrera de `limpiar()` descarta ítems sin nombre pero no la ingesta
que se queda vacía.

**Ubicación:** `src/app/domain/plan.edit.ts:158-165`

**Mejora propuesta:** descartar también las ingestas con `items` vacío (mismo
criterio que con filas sin rellenar) + spec del caso.

**Esfuerzo:** Bajo

---

## 🟡 P3 — Visual, UX, accesibilidad y PWA

### 17. `.btn:disabled` no tiene estilo visual

**Problema:** ningún SCSS define el estado deshabilitado: el botón de login
("cargando"), "Guardar plan" y "Guardar perfil" se ven idénticos estando
deshabilitados. El usuario no sabe si su tap hizo algo.

**Ubicación:** `src/styles.scss:225-248` (ausente); afecta a
`login.page.ts:37`, `plan.page.html:474`, `ajustes.page.html:80`

**Mejora propuesta:** dos reglas globales (`.btn:disabled { opacity; cursor }`).
Quick win de 5 minutos con impacto en todos los formularios.

**Esfuerzo:** Trivial

---

### 18. Contraste insuficiente en modo claro (WCAG AA)

**Problema:** `--color-neutral-600` (#7d7979) sobre el fondo claro ≈ **3.9:1**,
por debajo del 4.5:1 exigido para texto pequeño. Lo usan `.kicker` (11px),
`.item .c` (12px), `.empty` y fechas. El acento #ec3013 ≈ 4.3:1 también queda
corto en `.hora` (13px) y el `summary` de receta (11px).

**Ubicación:** `src/styles.scss:46, 73, 143-149`

**Mejora propuesta:** oscurecer `--color-neutral-600` a ~#6f6b6b (o usar el
700 para texto ≤12px) y revisar el acento en tamaños pequeños. Un cambio de
una variable arregla toda la app clara.

**Esfuerzo:** Trivial

---

### 19. Errores de login en inglés y sin anunciar a lectores de pantalla

**Problema:** el login muestra `e.message` crudo de Firebase ("Firebase: Error
(auth/invalid-credential).") en inglés. Además ningún `.err` de la app tiene
`role="alert"`/`aria-live`: los errores no se anuncian.

**Ubicación:**

- `src/app/features/login/login.page.ts:126`
- `.err` en `login.page.ts:40`, `peso.page.html:65`, `plan.page.html:464`,
  `ajustes.page.html:77`

**Mejora propuesta:**

- Mapear códigos a mensajes en español (`auth/invalid-credential` → "Correo o
  contraseña incorrectos", etc.). El patrón `(e as { code?: string }).code` ya
  existe duplicado en `auth.service.ts:42` y `dia.service.ts:39`: extraer a
  `core/firebase.errors.ts`.
- Añadir `role="alert"` al estilo/clase `.err` global.

**Esfuerzo:** Bajo

---

### 20. Huecos PWA en iOS: icono, identidad y fuentes offline

**Problemas:**

- **Sin `apple-touch-icon`**: "Añadir a pantalla de inicio" en iOS usará una
  captura borrosa en vez del icono (hay 8 PNGs listos en `public/icons/`).
- **Manifest sin `id`**: sin identidad estable de la app instalada.
- **Google Fonts fuera del service worker**: ngsw solo cachea assets locales;
  offline, Archivo cae a system-ui tras la primera carga.
- Iconos con `purpose: "maskable any"` combinado: Google recomienda entradas
  separadas (el recorte maskable puede arruinar el "any").
- `noscript` en inglés y sin `meta description`.

**Ubicación:**

- `src/index.html:5, 7, 20-32, 36`
- `public/manifest.webmanifest:2, 17`
- `ngsw-config.json:4-29`

**Mejora propuesta:** añadir `<link rel="apple-touch-icon">`, `"id": "/"` en el
manifest, assetGroup de fonts en ngsw, separar `purpose`, `meta description` y
noscript en español.

**Esfuerzo:** Bajo

---

### 21. Marca inconsistente: "Plan de Jesús" vs "MiSalud"

**Problema:** el `<title>` y el manifest dicen "Plan de Jesús" mientras login y
shell dicen "MiSalud". Al instalar la PWA, el nombre que ve el usuario no
coincide con el de la app.

**Ubicación:** `src/index.html:5`, `public/manifest.webmanifest`,
`login.page.ts:14`, `shell.html:7`

**Mejora propuesta:** unificar todo a "MiSalud" (o al nombre elegido) en
title, manifest `name`/`short_name` y cabeceras.

**Esfuerzo:** Trivial

---

### 22. Accesibilidad: lo que queda tras MEJORAS.md #12

**Complementa a MEJORAS.md #12** (que dejó hechos los `role="checkbox"`,
`aria-current` y tap targets de `.chk`). Pendiente nuevo detectado:

- **Tablist ARIA a medias** en el editor de Plan: `role="tablist"`/`role="tab"`
  sin `aria-controls`, sin `tabindex` ni flechas — peor que un grupo de botones
  (`plan.page.html:12-48`). O patrón completo o `aria-pressed` simple.
- **Pills de día sin estado accesible** (`plan.page.html:52-58`) y pills de
  compra que dicen solo "L", "M", "X" sin `aria-label="Lunes"`…
  (`compra.page.html:9-17`).
- **aria-labels genéricos repetidos**: 12 "Borrar"/"Subir"/"Bajar" idénticos en
  el editor (un lector de pantalla no sabe qué borra cada uno); "Ver receta"
  sin el nombre del plato (`plan.page.html:127-139…`, `receta-detalle.ts:12`).
- **Gráfica SVG inaccesible**: sin `role="img"` ni resumen textual de la
  tendencia ("bajando 0,4 kg/semana") (`peso-chart.ts:13`).
- **Tap targets < 44px**: flechas de día y botones tema/ajustes (34×34),
  `.pill` ~30px, `.del` ~24px (`shell.scss:39-50, 69-80, 98-104`;
  `styles.scss:909-932`). El patrón `::after inset:-7px` de `.chk`
  (`styles.scss:447-451`) es la solución ya existente a replicar.
- Banner offline sin `role="status"` (`shell.html:2`).

**Esfuerzo:** Bajo-Medio

---

### 23. Editor de Plan: extraer el bloque ↑↓✕ repetido 4 veces

**Problema:** el clúster de acciones subir/bajar/borrar está copiado 4 veces
(~25 líneas × 4: ítems, bloques, hábitos, objetivos) — ~100 líneas de plantilla
que además arrastran los aria-labels genéricos de #22.

**Ubicación:** `src/app/features/plan/plan.page.html:119-143, 287-309, 358-380, 414-436`

**Mejora propuesta:** componente `<app-edit-acciones>` con inputs
`puedeSubir/puedeBajar` y outputs `subir/bajar/borrar`, que genere labels
contextuales ("Subir alimento 2 de Desayuno"). De paso: pills de día con
indicador de "día incompleto" y sustituir el `confirm()` nativo por el toast
con undo (ver #26).

**Esfuerzo:** Bajo-Medio

---

### 24. UX por pantalla: mejoras concretas

**Hoy**

- Sin `@empty`: un día sin comidas en el plan queda en blanco sin mensaje
  (`hoy.page.html:46-77`). Añadir "Este día no tiene comidas en el plan" con
  enlace a `/plan`.
- Feedback al completar el 100% del día (hoy solo cambia el color del número):
  micro-celebración o estado visual distinto. Complementa MEJORAS.md #14.
- `<summary>` de receta con el nombre del plato ("Ver receta de Gazpacho").
- Botón "Hoy" junto a las flechas para volver rápido tras navegar lejos.

**Semana**

- Indicador de cumplimiento por día (mini-barra con los checks de ese día vía
  `DiaService`): hoy la fila no dice nada de progreso.
- Marcar el día _seleccionado_, no solo el día real (`semana.page.html:3`).
- `resumenComida/resumenCena` (con el filtro mágico `x.n !== 'Agua'`) y
  `tituloCorto` son lógica pura de dominio viviendo en el componente
  (`semana.page.ts:27-53`): mover a `domain/semana.calc.ts`.

**Peso**

- `diaSemana` duplicado en `hoy.page.ts:67-69` y `shell.ts:33-35`;
  `fmtDia` (`peso.page.ts:65-71`) candidato a pipe compartido en `shared/`.
- Input fecha + peso en una sola fila en móvil (hoy la fecha ocupa línea entera).

**Compra**

- Persistir la selección de días (se pierde al cambiar de pestaña).

**Global**

- `NavegacionService.fecha` nunca avanza solo: la app abierta a las 23:59 sigue
  mostrando "ayer" hasta recargar (`core/navegacion.service.ts:19`). Un timer
  a medianoche o recomputar al `visibilitychange` lo resuelve.
- `scrollPositionRestoration: 'top'` en el router y quitar
  `withComponentInputBinding()` si no se usa (ninguna ruta tiene params)
  (`app.config.ts:17`).

**Esfuerzo:** Medio (en conjunto)

---

## 🟢 P4 — Ideas de evolución

### 25. Estados "guardando" y undo en vez de `confirm()` nativo

- Anti doble-tap: estado "Guardando…" en Peso, Plan y Ajustes (con el estilo
  disabled de #17).
- Sustituir los `confirm()` nativos (borrar peso, borrar ítems del plan) por un
  toast con acción "Deshacer" apoyándose en el `AvisoService` existente — más
  móvil-friendly y menos bloqueante.

**Esfuerzo:** Medio

---

### 26. Lista de la compra con checkboxes

**Problema:** es la pantalla que más pide un estado de "ya lo tengo en el
carro". Hoy la lista es de solo lectura.

**Mejora propuesta:** checkboxes para tachar artículos al comprar. Persistencia
opcional: si se guarda en Firestore necesita schema nuevo (ojo con la regla de
no tocar shapes sin migración); si es efímero, un signal por sesión o
`localStorage` por semana visible basta.

**Esfuerzo:** Medio

---

### 27. Coverage y formato ampliado en tooling

- Coverage de Vitest con threshold mínimo en CI (hoy sin cobertura medida).
- `format:check` solo cubre `src/**/*.{ts,html,scss}`: ampliar a `scripts/`,
  `tests/`, `*.md`, `*.json`.
- Considerar reporter JUnit para ver tests en la UI de GitHub Actions.

**Esfuerzo:** Bajo

---

## Fortalezas confirmadas en este análisis

Además de las ya listadas en MEJORAS.md, este análisis confirma:

| Aspecto              | Detalle                                                                                              |
| -------------------- | ---------------------------------------------------------------------------------------------------- |
| Rollback de toggles  | `dia.service.ts:29-36` distingue errores permanentes de transitorios: el punto más sólido del código |
| Memoria de listeners | Unsubscribe previo + `DestroyRef` + `detener()` en logout, correcto en todos los servicios           |
| Siembra del plan     | Respeta `fromCache` y `version`: sin riesgo de pisar ediciones del usuario                           |
| Frontera pura/impura | `plan.edit.ts` es un buen ejemplo de separación dominio/servicios                                    |
| Tokens CSS           | Design tokens serios con dark mode y safe-area en `styles.scss`                                      |
| Secretos             | El SA JSON nunca entró en git; CI usa el secret correctamente                                        |

---

## Quick wins (empezar aquí, ~1 hora total)

| #    | Acción                                                           | Impacto                       |
| ---- | ---------------------------------------------------------------- | ----------------------------- |
| 17   | `.btn:disabled` (2 reglas CSS)                                   | Todos los formularios         |
| 18   | Oscurecer `--color-neutral-600`                                  | WCAG AA en toda la app clara  |
| 3+10 | Constantes a `plan.types.ts` (arregla el bug de la hora de cena) | Elimina un bug + 4 duplicados |
| 21   | Unificar marca "MiSalud"                                         | Coherencia PWA                |
| 2    | `seed.mjs` aborta si el email no resuelve                        | Evita datos corruptos en prod |

---

## Resumen de esfuerzo

| Prioridad                        | Mejoras | Esfuerzo total estimado |
| -------------------------------- | ------- | ----------------------- |
| 🔴 P0 Seguridad (1-2)            | 2       | ~1 hora                 |
| 🔴 P1 Bugs (3-8)                 | 6       | ~1,5 días               |
| 🟡 P2 Código/tooling (9-16)      | 8       | ~2 días                 |
| 🟡 P3 Visual/UX/a11y/PWA (17-24) | 8       | ~2,5 días               |
| 🟢 P4 Evolución (25-27)          | 3       | ~1,5 días               |
| **Total**                        | **27**  | **~7-8 días**           |

_Estimación para un solo desarrollador. Los quick wins son independientes y
pueden aplicarse en una sola sesión sin riesgo._
