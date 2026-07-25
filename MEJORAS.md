# MEJORAS — MiSalud PWA

Análisis completo de la aplicación (Julio 2026). Lista priorizada de mejoras
funcionales y de código, con referencia a archivos y líneas concretas.

---

## 🔴 PRIORIDAD ALTA — Impacto funcional directo

### 1. Estados de carga (spinners / skeletons)

**Problema:** No hay indicador visual de carga en ninguna parte (excepto el botón
de login). Al navegar entre días o al cargar datos iniciales, el usuario ve un
flash del plan seed antes de que Firestore responda.

**Ubicación:**
- `src/app/shell/shell.ts:52-54` — `arrancar()` carga plan, pesos y día sin indicador.
- `src/app/features/login/login.page.ts:37` — el botón se desactiva pero no muestra spinner.

**Mejora propuesta:**
- Añadir un `<app-skeleton>` o spinner global en el `<router-outlet>` mientras
  resuelve el guard de auth.
- Mostrar skeleton cards en la página de Hoy mientras `planSvc.plan()` resuelve.
- Añadir un pequeño spinner inline en el botón de login durante autenticación.

**Esfuerzo:** Bajo-Medio

---

### 2. Manejo de errores visible

**Problema:** Todos los `catch` de Firestore en servicios solo hacen
`console.warn`. Si la conexión falla, el usuario no sabe que su acción no se
guardó.

**Ubicación:**
- `src/app/core/plan.service.ts:53-55` — `cargarPerfil()`
- `src/app/core/plan.service.ts:82-84` — `cargarPlan()`
- `src/app/core/dia.service.ts:28-30` — `cargar()`
- `src/app/core/dia.service.ts:62-64` — `guardar()`
- `src/app/core/peso.service.ts:63` — listener error

**Mejora propuesta:**
- Crear un `ErrorService` (`providedIn: 'root'`) con un signal `mensaje` y un
  componente toast/snackbar que lo muestre automáticamente.
- Los servicios llaman a `errorSvc.mostrar('No se pudo guardar el peso')` en
  el catch en vez de solo `console.warn`.
- El toast se cierra solo tras 3-4 segundos o con tap.

**Esfuerzo:** Medio

---

### 3. Rollback en actualizaciones optimistas

**Problema:** `DiaService.guardar()` falla silenciosamente. El estado local se
actualiza pero el remoto no — quedan desincronizados sin notificación.

**Ubicación:** `src/app/core/dia.service.ts:40-51` y `:59-65`

**Mejora propuesta:**
- En el catch de `guardar()`, revertir la señal local al valor anterior.
- Notificar al usuario a través del `ErrorService` (ver mejora #2).
- Considerar un flag `synced` en el estado del día para mostrar un indicador
  visual de "pendiente de sincronizar".

**Esfuerzo:** Bajo

---

### 4. Recuperación de contraseña

**Problema:** No hay flujo "¿Olvidaste tu contraseña?" en el login. El servicio
`AuthService` no expone `sendPasswordResetEmail`.

**Ubicación:**
- `src/app/features/login/login.page.ts` — template sin enlace de recuperación.
- `src/app/core/auth.service.ts` — sin método de reset.

**Mejora propuesta:**
- Añadir enlace "¿Olvidaste tu contraseña?" debajo del formulario.
- Al pulsar, mostrar un input de email y un botón "Enviar enlace".
- Implementar `AuthService.resetPassword(email)` que llame a
  `sendPasswordResetEmail(auth, email)`.
- Mostrar mensaje de confirmación: "Revisa tu bandeja".

**Esfuerzo:** Bajo

---

### 5. Pantalla de ajustes / edición de perfil

**Problema:** El perfil (altura, peso inicial, fecha de inicio, objetivo) solo se
puede editar en la consola de Firestore. No hay pantalla de configuración.

**Ubicación:**
- `src/app/domain/plan.types.ts:1-10` — tipo `Perfil` con `nombre`, `alturaCm`,
  `pesoInicial`, `fechaInicio`, `objetivo`.
- `src/app/core/plan.service.ts` — `perfil` signal solo de lectura.

**Mejora propuesta:**
- Nuevo componente `src/app/features/ajustes/ajustes.page.ts` con ruta `/ajustes`.
- Formulario editable con los campos del perfil.
- Botón guardar que llame a `PlanService.actualizarPerfil(datos)`.
- Añadir enlace/ícono de engranaje en el header del shell.

**Esfuerzo:** Medio

---

## 🟡 PRIORIDAD MEDIA — UX y calidad de código

### 6. Animaciones y transiciones

**Problema:** Solo hay 1 animación (rotación del chevron de receta). Sin
transiciones de página, feedback visual en checkboxes, ni notificaciones
emergentes. La app se siente estática.

**Ubicación:** `src/styles.scss:295-297` — única animación existente.

**Mejora propuesta:**
- Transiciones de ruta con `@angular/animations` (fade o slide).
- Feedback visual al marcar checkbox de comida/entreno (pulse o scale).
- Animación de entrada para las cards al cargar la página.
- Toast notifications con animación slide-in/out.

**Esfuerzo:** Medio

---

### 7. Notificaciones push / recordatorios

**Problema:** PWA instalable pero sin usar la API de Notifications. No hay
recordatorios de pesaje, comidas ni entrenamiento.

**Mejora propuesta:**
- Pedir permiso de notificaciones al usuario (con explicación clara).
- Usar `localStorage` para programar alarmas diarias (pesaje por la mañana,
  recordatorio de cena, etc.).
- Añadir toggle de notificaciones en la pantalla de ajustes (#5).
- Notificación diaria de recordatorio de pesaje.

**Esfuerzo:** Alto

---

### 8. Gráficos avanzados y BMI

**Problema:** Solo hay un chart de peso. Con altura + peso disponibles, se podría
calcular y mostrar IMC. No hay visualización de calorías, macros ni progreso de
entrenamiento.

**Ubicación:**
- `src/app/features/peso/peso-chart.ts` — chart SVG existente.
- `src/app/domain/plan.types.ts` — `Perfil.alturaCm` ya disponible.

**Mejora propuesta:**
- Calcular y mostrar IMC en la sección de KPIs de peso (`peso.page.html:1-23`).
- Añadir badge de categoría IMC (bajo peso, normal, sobrepeso, obesidad).
- Opcional: chart de tendencia de IMC a lo largo del tiempo.

**Esfuerzo:** Bajo

---

### 9. Exportar / compartir datos

**Problema:** No hay opción para exportar historial de peso (CSV), compartir
recetas (Web Share API), ni imprimir la lista de la compra.

**Mejora propuesta:**
- Botón "Exportar CSV" en la página de peso que genere un archivo descargable.
- Botón "Compartir" en recetas usando `navigator.share()` si está disponible.
- Estilos `@media print` optimizados para la lista de la compra.
- Botón "Copiar lista" que copie el texto formateado al portapapeles.

**Esfuerzo:** Medio

---

### 10. Constante `ORDEN` duplicada

**Problema:** `ORDEN: IngestaKey[]` está definida idéntica en dos archivos.

**Ubicación:**
- `src/app/domain/compra.calc.ts:7`
- `src/app/features/hoy/hoy.page.ts:10`

**Mejora propuesta:**
- Extraer a `src/app/domain/plan.types.ts` como export compartida.
- Importar en ambos archivos.

**Esfuerzo:** Bajo

---

### 11. Limpieza de listeners en logout

**Problema:** `PesoService.escuchar()` usa `onSnapshot` pero no se desuscribe
al logout. Si el usuario hace logout/login, se acumulan listeners.

**Ubicación:**
- `src/app/core/peso.service.ts:54-65` — `escuchar()` con `onSnapshot`.
- `src/app/shell/shell.ts:58` — `logout()` no llama a `pesoSvc.detener()`.

**Mejora propuesta:**
- Añadir método `PesoService.detener()` que llame a la función `unsubscribe`
  devuelta por `onSnapshot`.
- Shell llama a `pesoSvc.detener()` antes de `auth.logout()`.
- Lo mismo para `DiaService` si se añaden listeners en el futuro.

**Esfuerzo:** Bajo

---

### 12. Accesibilidad (a11y)

**Problema:** Varios elementos interactivos no siguen estándares de accesibilidad.

**Ubicación y detalles:**
- `src/app/features/hoy/hoy.page.html:8,47` — checkboxes son `<button>` sin
  `role="checkbox"`, `aria-checked` ni `aria-label`.
- `src/app/features/peso/peso.page.html:28-39` — inputs sin `<label>`.
- `src/app/features/compra/compra.page.html:8-9` — pills sin `aria-pressed`.
- `src/app/shell/shell.html` — links activos sin `aria-current="page"`.
- `src/app/shell/shell.html` — tabs sin `role="tablist"` / `role="tab"`.

**Mejora propuesta:**
- Añadir `role="checkbox"` + `aria-checked` + `aria-label` a los botones de toggle.
- Asociar `<label for="...">` a los inputs de peso.
- Añadir `aria-pressed` a los pills de compra.
- Añadir `aria-current="page"` al link activo del nav.
- Añadir `role="tablist"` y `role="tab"` a la navegación por tabs.

**Esfuerzo:** Bajo-Medio

---

## 🟢 PRIORIDAD BAJA — Pulido y mantenimiento

### 13. Tests de servicios y componentes

**Problema:** Solo se testea lógica de dominio (15 tests) y reglas Firestore (10
tests). No hay tests de servicios (`AuthService`, `DiaService`, etc.) ni de
componentes.

**Mejora propuesta:**
- Añadir tests unitarios para `peso.calc.ts` con más edge cases.
- Tests de servicios usando mocks de Firebase (requiere capa de abstracción).
- Considerar Cypress/Playwright para tests E2E del flujo principal.

**Esfuerzo:** Alto

---

### 14. Barra de progreso diaria

**Problema:** El CSS de `.progreso` y `.progreso-barra` ya existe pero no se usa
en ningún template.

**Ubicación:** `src/styles.scss:507-548`

**Mejora propuesta:**
- Añadir barra de progreso en la página de Hoy mostrando % de comidas +
  entrenamiento completados del día.
- Calcular: `(ingestasHechas + entrenoHecho) / (totalIngestas + 1) * 100`.
- Usar los estilos CSS ya existentes.

**Esfuerzo:** Bajo

---

### 15. Gestos táctiles (swipe)

**Problema:** No hay swipe para navegar días. En un PWA móvil, esto es una
mejora natural de UX.

**Mejora propuesta:**
- Detectar swipe horizontal en la página de Hoy.
- Swipe derecha = día anterior, swipe izquierda = día siguiente.
- Usar `TouchEvents` o una librería ligera como `hammer.js`.
- Añadir transición visual de slide al cambiar de día.

**Esfuerzo:** Medio

---

### 16. Onboarding

**Problema:** No hay flujo de bienvenida para nuevos usuarios. El plan aparece
sin contexto.

**Mejora propuesta:**
- Detectar primer login (perfil sin `fechaInicio` o flag en localStorage).
- Mostrar 3-4 pantallas explicativas: qué es la app, cómo usar el plan,
  cómo pesarse, cómo generar la lista de la compra.
- Botón "Empezar" que lleve a Hoy.

**Esfuerzo:** Medio

---

### 17. Tabla de peso: encabezados semánticos

**Problema:** La tabla de registros no tiene `<thead>` ni `<th>`.

**Ubicación:** `src/app/features/peso/peso.page.html:61-75`

**Mejora propuesta:**
- Envolver la primera fila en `<thead>` con `<th>` para Fecha, Peso, Delta,
  Borrar.
- Mover las filas de datos a `<tbody>`.

**Esfuerzo:** Bajo

---

### 18. Breakpoint tablet

**Problema:** Solo hay mobile (<960px) y desktop. Las tablets se tratan como
móvil, desperdiciando espacio en pantalla.

**Mejora propuesta:**
- Añadir breakpoint tablet (~768px-1024px).
- En tablet: dos columnas para la página de Hoy (como desktop pero más
  compacto), grid de 3-4 columnas para Semana.
- Actualizar `src/styles.scss` con el nuevo media query.

**Esfuerzo:** Bajo-Medio

---

### 19. Versión de dependencia inconsistente

**Problema:** `@angular/platform-browser-dynamic` está en `^20.3.26` vs
`^20.0.0` del resto de paquetes Angular.

**Ubicación:** `package.json:38`

**Mejora propuesta:**
- Alinear a `^20.0.0` para consistencia.

**Esfuerzo:** Bajo

---

### 20. Centralizar `auth.uid!`

**Problema:** Hay 4 non-null assertions sobre `auth.uid` en distintos servicios,
sin un guard centralizado.

**Ubicación:**
- `src/app/core/plan.service.ts:33,36`
- `src/app/core/dia.service.ts:17`
- `src/app/core/peso.service.ts:50`

**Mejora propuesta:**
- Crear helper `requireUid()` en `AuthService` que lance error descriptivo si
  `uid` es null.
- Reemplazar las 4 `!` por llamadas a este helper.

**Esfuerzo:** Bajo

---

## Fortalezas existentes

Lo que la aplicación ya hace bien (no necesita cambios):

| Aspecto | Detalle |
|---|---|
| Tipado | Zero `any` types, `strict: true` máximo en tsconfig |
| Change detection | 100% OnPush + signals en los 10 componentes |
| Lazy loading | Todas las rutas usan `loadComponent` dinámico |
| Offline-first | Firestore `persistentLocalCache` + service worker |
| Seguridad | Reglas Firestore aisladas por `uid` + tests |
| Limpieza de código | Sin bloat de dependencias, arquitectura consistente |
| Testing dominio | 15 tests de lógica pura + 10 tests de reglas |

---

## Resumen de esfuerzo

| Prioridad | Mejoras | Esfuerzo total estimado |
|---|---|---|
| 🔴 Alta (1-5) | 5 | ~2-3 días |
| 🟡 Media (6-12) | 7 | ~4-5 días |
| 🟢 Baja (13-20) | 8 | ~3-4 días |
| **Total** | **20** | **~9-12 días** |

*Estimación para un solo desarrollador. Con experiencia en Angular y Firebase,
algunas mejoras pueden hacerse en paralelo.*
