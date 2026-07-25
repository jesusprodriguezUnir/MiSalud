repo: jesusprodriguezUnir/MiSalud
branch: main

## Last sync
date: 2026-07-25T05:42:49Z

### Updated in this project
- Rediseño completo de la app (móvil PWA + panel de escritorio) sobre el sistema Modernist.
- Datos reales del plan (dieta, entreno, hábitos, objetivos) portados desde `plan.seed.ts`.
- Nuevo: progreso del día, dos variantes de la pantalla «Hoy», modo oscuro y selector de paciente.

## Screen map
| Pantalla | Origen en el repo |
| --- | --- |
| Login | src/app/features/login/login.page.ts |
| Hoy (A/B) | src/app/features/hoy/hoy.page.html · domain/plan.seed.ts |
| Semana | src/app/features/semana/semana.page.html |
| Peso | src/app/features/peso/peso.page.html · domain/peso.calc.ts |
| Compra | src/app/features/compra/compra.page.html · domain/compra.calc.ts |
| Cabecera / tabs | src/app/shell/shell.html |
