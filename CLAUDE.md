# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A single-user Angular 20 PWA for tracking a personal diet/training plan and weight (health data
for one person, "Jesús"). Everything is persisted in Firebase (Auth + Firestore). The original
vanilla HTML/ES-modules version is kept in [`legacy/`](legacy/) as reference only — do not build
new features there.

## Commands

```bash
npm run dev          # ng serve on http://localhost:4200
npm run build         # production build
npm run lint           # ng lint
npm test               # vitest run — pure domain logic only (src/app/domain/**/*.spec.ts), no DOM
npm run test:watch    # vitest in watch mode
npm run test:coverage # same tests with v8 coverage + thresholds (what CI runs)
npm run test:rules    # firestore.rules against the emulator (needs Java); firebase emulators:exec --only firestore "vitest run --config vitest.rules.config.ts"
npm run emulators     # start Auth + Firestore emulators (needs Java)
npm run seed <uid>    # seed a user's profile/plan (uses FIRESTORE_EMULATOR_HOST when run against emulators)
npm run fotos <uid>   # backfill recipe photos (`receta.fotoUrl`) into an already-seeded plan; `--dry-run`, `--forzar`
npm run format         # prettier --write on src/, scripts/, tests/, root *.md/*.json and the workflows
npm run deploy         # ng build && firebase deploy --only firestore:rules,hosting
npm run deploy:rules   # firestore.rules only, via the Firebase Rules API (see below)
```

### Credentials for the scripts

`seed`, `fotos` and `deploy:rules` all need a Firebase Admin service account. They read it, in
order, from `GOOGLE_APPLICATION_CREDENTIALS`, `MISALUD_SA_PATH`, or `~/.config/misalud/sa.json`
(on Windows, `%USERPROFILE%\.config\misalud\sa.json`) — **never from the repo root**. They used to
scan the working directory for a `*firebase-adminsdk*.json`, which encouraged leaving the private
key inside the project where any zip, backup or cloud sync would carry it off. The shared
resolution lives in `scripts/lib/credenciales.mjs`, together with `scripts/lib/seed.mjs` (loads
`plan.seed.ts` from Node) and `scripts/lib/uid.mjs` (resolves `<uid|email>`; **aborts** if the
email does not exist in Auth, instead of writing to `usuarios/{email}/…`).

`deploy:rules` exists because `firebase deploy` first checks that the Firestore API is enabled,
which needs `serviceusage.services.get` — a permission the Firebase Admin service account does not
have. The script (`scripts/deploy-rules.mjs`) publishes the ruleset straight through the
firebaserules API, which the same credentials _can_ do. Deploying the rules is not optional: the
project shipped for a while with a deny-all ruleset live, so Auth worked and every read/write to
Firestore failed silently.

To run a single test file: `npx vitest run src/app/domain/peso.calc.spec.ts`.

There are two separate, non-overlapping Vitest configs:

- `vitest.config.ts` — pure domain logic (`src/app/domain/**/*.spec.ts`), environment `node`, no Angular/DOM.
- `vitest.rules.config.ts` — `tests/firestore.rules.spec.ts` against the Firestore emulator, exercised via `test:rules`.

CI (`.github/workflows/ci.yml`) runs on push/PR to `main`: format → lint → `npm audit` (informative)
→ `test:coverage` → `test:rules` (emulator) → build, uploading `dist/` as an artifact. On push to
`main` the `deploy` job downloads that artifact instead of recompiling, then publishes **hosting
with the Firebase CLI and the rules with `npm run deploy:rules`** — the CLI cannot publish rules
with this service account (see above), so doing both through it was silently broken. Both steps use
the `FIREBASE_SERVICE_ACCOUNT` secret. A `concurrency` group serialises deploys without cancelling
them. To develop against emulators locally, set `useEmulators: true` in
`src/environments/environment.ts`.

ESLint runs `strict-type-checked` (so `no-floating-promises` is on, which matters with this many
`onSnapshot`/`async` calls), plus `eqeqeq` and `no-explicit-any`. A handful of strict rules are
switched off in `eslint.config.js` with the reason next to each one — read that before adding a
blanket disable comment.

## Architecture

Standalone components + signals throughout, no NgRx — state lives in `providedIn: 'root'` services
(there are only 4 collections and a handful of screens, so a store would be overkill).

```
src/app/
  core/       auth · plan · dia · peso · conectividad · navegacion · aviso · export — signal-based
              services + firebase.providers.ts + firebase.errors.ts (error codes → Spanish messages)
  domain/     types (plan.types.ts), the plan seed (plan.seed.ts), and pure calc/edit logic + specs
              (peso · compra · foto · semana · ics · plan.edit · fecha)
  shell/      header, offline banner, tab bar, aviso toast
  features/   login · hoy · semana · peso · compra · plan · ajustes — lazy routes
  shared/     reusable pipes
```

Anything pure and testable belongs in `domain/`, not in a service or a component: that is why
calendar export (`ics.calc.ts`), the Semana summaries (`semana.calc.ts`) and the shopping list
(`compra.calc.ts`) live there while the services keep only the impure part (`Blob`, `a.click()`,
Firestore). `plan.seed.ts` has a structural spec (`plan.seed.spec.ts`) because it is 750
hand-transcribed lines and is what gets written verbatim to Firestore on first run.

Shared constants that would otherwise drift live in `plan.types.ts`: `ORDEN_INGESTAS`,
`NOMBRE_INGESTA`, `HORA_POR_DEFECTO` and the validation ranges `PESO_MIN/MAX`, `ALTURA_MIN/MAX`.
The dinner hour was once 20:00 in the exporter and 21:00 in the editor because there were two
copies — do not add a third.

`core/firebase.providers.ts` wires Firestore with `persistentLocalCache` + `persistentMultipleTabManager`
so the app works offline and syncs across tabs on reconnect — this is intentional and mirrors the
original vanilla app's behavior; the service worker (`@angular/service-worker`, PWA app-shell only)
never touches Firestore's own cache.

### Data model

```
usuarios/{uid}/perfil/datos        { nombre, alturaCm, pesoInicial, fechaInicio, objetivo }
usuarios/{uid}/plan/actual         { version, actualizado, dieta[7], entreno[7], habitos[], objetivos[] }
usuarios/{uid}/pesos/{YYYY-MM-DD}  { fecha, peso, ts }
usuarios/{uid}/dias/{YYYY-MM-DD}   { fecha, hechas: {desayuno:bool,...}, entreno: bool }
```

The document id _is_ the date (`YYYY-MM-DD`): idempotent by design, one record per day, no
compound indexes or range queries needed. This is the same schema the original vanilla app used —
do not change document shapes without a migration plan, since real data already exists under it.
Types describing this model live in `src/app/domain/plan.types.ts` and must stay in sync with
`firestore.rules`.

The plan (diet + training) is seeded from `src/app/domain/plan.seed.ts` into
`usuarios/{uid}/plan/actual` on first run, and from then on is edited **in the app** (the Plan
screen) rather than redeployed. Two consequences worth keeping in mind:

- Seeding only happens when the document does not exist _according to the server_
  (`!snapshot.metadata.fromCache`), and a plan with an unexpected `version` is left alone. Bumping
  `PLAN_VERSION` must never resow, or it would wipe the user's edits.
- The same applies to anything added to the seed later: recipe photos (`receta.fotoUrl`, stock
  images from Wikimedia Commons) live in `plan.seed.ts`, but an already-seeded plan will never
  pick them up. `scripts/fotos.mjs` (`npm run fotos`) is the backfill: it reads the live plan,
  matches dishes by name against the seed, fills in only the missing `fotoUrl`s and writes back
  `dieta` + `actualizado` — never `version`. `--dry-run` previews; `--forzar` overwrites photos
  the user set from the Plan screen (off by default).
- All plan mutation lives in `src/app/domain/plan.edit.ts` as pure functions. `limpiar()` is the
  barrier before every write: it trims strings, drops `undefined` keys (the Firestore SDK throws on
  them) and discards rows the user added but never filled in.

Perfil, plan and the visible day are all followed with `onSnapshot`, not one-off `getDoc`s, so an
edit made on the phone shows up on the laptop without a reload. Two failure modes are handled
explicitly and should stay that way:

- If plan or perfil fail to load, `PlanService.error` is set and the shell renders a blocking error
  screen with "Reintentar" **instead of the outlet**. The signals still hold the local seed at that
  point, and showing a stranger's plan as if it were the user's — editable — is worse than showing
  nothing.
- `onSnapshot` destroys its listener when the error callback fires, so `PesoService` reopens the
  stream with a backoff and, once the attempts run out, flips `desconectado` for the Peso screen to
  offer a manual retry. Without that, one `permission-denied` froze the weights until a reload.

`logout()` stops the streams, calls `reset()` on plan/peso/dia to wipe the health data from memory,
and navigates to `/login` — the guard only runs on navigation, so without that last step the screen
kept showing the previous session's data.

### Security model

`firestore.rules` isolates everything by `uid` under `usuarios/{uid}`; there are no global/shared
collections on purpose (health data). Anything outside `usuarios/{uid}` is denied by the catch-all
rule. Writes to `pesos/{fecha}` and `dias/{fecha}` additionally validate:

- the `YYYY-MM-DD` id format, and that `data.fecha` **equals the document id** — `PesoService`
  reads the collection with `orderBy('fecha')`, and the chart and moving average assume that order;
- `hasOnly` on the top-level keys of both documents, and on the keys of `dias.hechas` (only the five
  `IngestaKey`s), so the documents cannot grow fields the `EstadoDia`/`Peso` types do not describe;
- for weight, the numeric range — kept in sync by hand with `PESO_MIN`/`PESO_MAX` in
  `plan.types.ts`, since rules cannot import (there is a comment in the rules pointing at them).

`PesoService.add()` validates the same things client-side: the rules reject an out-of-range weight
with a bare `permission-denied`, which is useless as a message.

`src/environments/environment.ts` Firebase web keys are public by design (protection comes from the
rules, not the keys) — never treat them as secrets. The Firebase Admin service account JSON must
never be committed nor left in the repo root; see "Credentials for the scripts" above. CI gets it
via the `FIREBASE_SERVICE_ACCOUNT` GitHub secret.
