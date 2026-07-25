# Plan de Jesús

App web para seguir el plan dietético de junio 2026: qué cocinar cada día, qué entrenar y
registro de peso con tendencia. Todo persistido en Firebase.

## Arquitectura

| Pieza | Decisión | Motivo |
|---|---|---|
| Front | HTML + ES modules, sin framework ni build | Son ~1.200 líneas y una sola pantalla. Un bundler aquí solo añade fricción de mantenimiento |
| Datos | Firestore con `persistentLocalCache` + multi-tab | Funciona en el metro y en la cocina sin cobertura; sincroniza al volver |
| Auth | Email/password, persistencia local | Mismo usuario en móvil y portátil sin volver a entrar |
| Plan | Semilla en `plan.js` → `usuarios/{uid}/plan/actual` | Arranca sin configurar nada, pero luego se edita en Firestore sin redesplegar |
| Gráfica | SVG generado a mano | Evita una dependencia CDN para dibujar dos polilíneas, y funciona offline |

### Modelo de datos

```
usuarios/{uid}/perfil/datos        { nombre, alturaCm, pesoInicial, fechaInicio, objetivo }
usuarios/{uid}/plan/actual         { version, dieta[7], entreno[7], habitos[], objetivos[] }
usuarios/{uid}/pesos/{YYYY-MM-DD}  { fecha, peso, ts }
usuarios/{uid}/dias/{YYYY-MM-DD}   { fecha, hechas: {desayuno:bool,...}, entreno: bool }
```

El id del documento es la fecha: idempotente por diseño, un registro por día y sin necesidad
de índices compuestos ni de consultas por rango.

## Puesta en marcha

1. **Crear el proyecto** en <https://console.firebase.google.com> (plan Spark gratuito sobra).
2. **Activar Authentication → Sign-in method → Correo electrónico/contraseña**, y crear el
   usuario de Jesús en la pestaña *Users*.
3. **Crear la base de datos Firestore** en modo producción, región `eur3` (Europa).
4. **Registrar una app web** y copiar el objeto de configuración en
   `public/js/firebase-config.js`. Ajusta también `PERFIL_DEFECTO` si cambia el objetivo de peso.
5. Desplegar:

```bash
npm i -g firebase-tools
firebase login
# edita .firebaserc y pon el id real del proyecto
firebase deploy --only firestore:rules,hosting
```

En local: `firebase emulators:start` o `firebase serve`.
**No abras `index.html` con doble clic**: los ES modules no cargan desde `file://` por CORS.

6. En el móvil, abrir la URL de Hosting y *Añadir a pantalla de inicio*.

## Seguridad

Las claves de `firebase-config.js` son públicas por diseño; quien protege los datos son las
reglas de `firestore.rules`, que aíslan por `uid` y validan tipo y rango del peso y el formato
de las fechas usadas como id. Todo lo que quede fuera de `usuarios/{uid}` está denegado.

Al ser datos de salud, conviene además:

- No compartir la cuenta con más gente de la necesaria.
- Activar la verificación en dos pasos en la cuenta de Google del proyecto.
- Si algún día entra un segundo paciente, mantener el mismo esquema por `uid` en vez de meter
  un campo `pacienteId` en documentos compartidos.

## Contenido

- **Dieta**: transcripción literal del PDF del nutricionista, con las 14 recetas completas
  (ingredientes y elaboración) y las cantidades por ración.
- **Entrenamiento**: respeta el esquema que Jesús ya hace (fuerza ×2, pilates, natación,
  caminatas) y lo concreta en ejercicios, series y repeticiones, con las restricciones del
  informe clínico: osteopenia, tendinitis, hernia de hiato/ERGE y mareos por maniobra de
  Valsalva. **Es una propuesta, no una prescripción**: conviene validarla con su fisioterapeuta
  o entrenador.
- **Peso**: media móvil de 7 días, ritmo semanal calculado sobre la media (no sobre el dato
  suelto) y línea de objetivo.
- **Compra**: agrega gramajes de las raciones y de los ingredientes de cada receta para los
  días que marques.

## Posibles siguientes pasos

- Registro de composición corporal (InBody) para seguir grasa visceral y % graso, que son los
  objetivos reales del informe; el peso solo es un proxy.
- Recordatorios push con FCM para las ingestas y la cena temprana.
- Exportar la lista de la compra a la app del supermercado.
- Histórico de síntomas digestivos para correlacionar con comidas concretas.
