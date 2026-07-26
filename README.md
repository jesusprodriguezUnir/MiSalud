# Plan de Jesús

App web para seguir el plan dietético de junio 2026: qué cocinar cada día, qué entrenar y registro
de peso con tendencia. Todo persistido en Firebase.

Reescrita en **Angular 20** (componentes standalone + signals, TypeScript estricto) con soporte
**PWA** instalable. La versión original en HTML + ES modules sin build está conservada en
[`legacy/`](legacy/) como referencia.

## Arquitectura

| Pieza   | Decisión                                                 | Motivo                                                                                    |
| ------- | -------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Front   | Angular 20, standalone components, signals, sin NgRx     | Estado en servicios `providedIn: 'root'`; son 4 colecciones y una pantalla, NgRx sobraría |
| Datos   | Firestore con `persistentLocalCache` + multi-tab         | Funciona en el metro y en la cocina sin cobertura; sincroniza al volver                   |
| Auth    | Email/password, persistencia local                       | Mismo usuario en móvil y portátil sin volver a entrar                                     |
| Plan    | Semilla en `plan.seed.ts` → `usuarios/{uid}/plan/actual` | Arranca sin configurar nada, pero luego se edita en Firestore sin redesplegar             |
| Gráfica | SVG declarativo (componente `peso-chart`)                | Sin dependencia CDN para dibujar dos polilíneas; funciona offline                         |
| PWA     | `@angular/service-worker` para el app shell              | La caché de datos la sigue dando Firestore; el SW no toca Firestore                       |

### Estructura

```
src/app/
  core/       auth · plan · dia · peso · conectividad · navegacion (servicios con signals)
  domain/     tipos, seed del plan y lógica pura (peso.calc, compra.calc, fecha.util) + tests
  shell/      cabecera, banda offline y barra de pestañas
  features/   login · hoy · semana · peso · compra (rutas lazy)
  shared/     pipes reutilizables
```

### Modelo de datos

```
usuarios/{uid}/perfil/datos        { nombre, alturaCm, pesoInicial, fechaInicio, objetivo }
usuarios/{uid}/plan/actual         { version, actualizado, dieta[7], entreno[7], habitos[], objetivos[] }
usuarios/{uid}/pesos/{YYYY-MM-DD}  { fecha, peso, ts }
usuarios/{uid}/dias/{YYYY-MM-DD}   { fecha, hechas: {desayuno:bool,...}, entreno: bool }
```

El id del documento es la fecha: idempotente por diseño, un registro por día y sin necesidad de
índices compuestos ni de consultas por rango. **Es el mismo modelo que la app original**, así que
los datos ya guardados en Firestore siguen siendo válidos sin migración.

## Puesta en marcha

Necesitas **Node 22+**. Instala dependencias con `npm ci`.

### 1. Crear el proyecto Firebase (manual, una vez)

1. Crea el proyecto en <https://console.firebase.google.com> (plan Spark gratuito sobra).
2. **Authentication → Sign-in method → Correo electrónico/contraseña**, y crea el usuario de Jesús en
   la pestaña _Users_.
3. **Firestore Database** en modo producción, región `eur3` (Europa).
4. **Registra una app web** y pega el objeto de configuración en
   [`src/environments/environment.ts`](src/environments/environment.ts) **y** en
   [`environment.prod.ts`](src/environments/environment.prod.ts) (comparten las mismas claves, que
   no son secretas). Ajusta `PERFIL_DEFECTO` si cambia el objetivo de peso.
5. Pon el id real del proyecto en [`.firebaserc`](.firebaserc) y en el `projectId` del workflow de CI.

### 2. Desarrollo

```bash
npm run dev          # ng serve en http://localhost:4200
npm run emulators    # emuladores de Auth + Firestore (necesita Java)
npm run seed <uid>   # siembra el perfil (usa FIRESTORE_EMULATOR_HOST para el emulador)
```

Para desarrollar contra los emuladores, pon `useEmulators: true` en `environment.ts`.

### 3. Tests

```bash
npm test             # lógica pura (media móvil, ritmo, agregación de la compra) — rápido, sin emulador
npm run test:rules   # reglas de firestore.rules contra el emulador (necesita Java)
```

### 4. Despliegue

```bash
npm i -g firebase-tools
firebase login
npm run deploy       # build + firebase deploy (reglas + hosting)
```

En CI, cada push a `main` ejecuta `test → test:rules → build` y despliega a Hosting + reglas
(ver [`.github/workflows/ci.yml`](.github/workflows/ci.yml)). Requiere el secret
`FIREBASE_SERVICE_ACCOUNT` con el JSON de la cuenta de servicio.

En el móvil, abre la URL de Hosting y _Añadir a pantalla de inicio_.

## Seguridad

Las claves de `environment.ts` son públicas por diseño; quien protege los datos son las reglas de
[`firestore.rules`](firestore.rules), que aíslan por `uid` y validan tipo y rango del peso y el
formato de las fechas usadas como id. Todo lo que quede fuera de `usuarios/{uid}` está denegado.
La cuenta de servicio de admin (`service-account.json`) **nunca** se sube: está en `.gitignore`.

Al ser datos de salud, conviene además:

- No compartir la cuenta con más gente de la necesaria.
- Activar la verificación en dos pasos en la cuenta de Google del proyecto.
- Si algún día entra un segundo paciente, mantener el mismo esquema por `uid` en vez de meter un
  campo `pacienteId` en documentos compartidos.

## Contenido

- **Dieta**: transcripción literal del PDF del nutricionista, con las 14 recetas completas
  (ingredientes y elaboración) y las cantidades por ración.
- **Entrenamiento**: respeta el esquema que Jesús ya hace (fuerza ×2, pilates, natación,
  caminatas) y lo concreta en ejercicios, series y repeticiones, con las restricciones del informe
  clínico: osteopenia, tendinitis, hernia de hiato/ERGE y mareos por maniobra de Valsalva. **Es una
  propuesta, no una prescripción**: conviene validarla con su fisioterapeuta o entrenador.
- **Peso**: media móvil de 7 días, ritmo semanal calculado sobre la media (no sobre el dato suelto)
  y línea de objetivo.
- **Compra**: agrega gramajes de las raciones y de los ingredientes de cada receta para los días
  que marques.

## Posibles siguientes pasos

- Registro de composición corporal (InBody) para seguir grasa visceral y % graso, que son los
  objetivos reales del informe; el peso solo es un proxy.
- Recordatorios push con FCM para las ingestas y la cena temprana.
- Exportar la lista de la compra a la app del supermercado.
- Editor del plan desde la propia UI (hoy se edita en Firestore).
- Histórico de síntomas digestivos para correlacionar con comidas concretas.
