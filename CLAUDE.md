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
npm run test:rules    # firestore.rules against the emulator (needs Java); firebase emulators:exec --only firestore "vitest run --config vitest.rules.config.ts"
npm run emulators     # start Auth + Firestore emulators (needs Java)
npm run seed <uid>    # seed a user's profile/plan (uses FIRESTORE_EMULATOR_HOST when run against emulators)
npm run fotos <uid>   # backfill recipe photos (`receta.fotoUrl`) into an already-seeded plan; `--dry-run`, `--forzar`
npm run format         # prettier --write on src/**/*.{ts,html,scss}
npm run deploy         # ng build && firebase deploy --only firestore:rules,hosting
npm run deploy:rules   # firestore.rules only, via the Firebase Rules API (see below)
```

`deploy:rules` exists because `firebase deploy` first checks that the Firestore API is enabled,
which needs `serviceusage.services.get` — a permission the Firebase Admin service account does not
have. The script (`scripts/deploy-rules.mjs`) publishes the ruleset straight through the
firebaserules API, which the same credentials *can* do. Deploying the rules is not optional: the
project shipped for a while with a deny-all ruleset live, so Auth worked and every read/write to
Firestore failed silently.

To run a single test file: `npx vitest run src/app/domain/peso.calc.spec.ts`.

There are two separate, non-overlapping Vitest configs:
- `vitest.config.ts` — pure domain logic (`src/app/domain/**/*.spec.ts`), environment `node`, no Angular/DOM.
- `vitest.rules.config.ts` — `tests/firestore.rules.spec.ts` against the Firestore emulator, exercised via `test:rules`.

CI (`.github/workflows/ci.yml`) runs on push/PR to `main`: lint → `npm test` → `test:rules` (emulator)
→ build, then deploys hosting + Firestore rules on push to `main` using the
`FIREBASE_SERVICE_ACCOUNT` secret. To develop against emulators locally, set `useEmulators: true`
in `src/environments/environment.ts`.

## Architecture

Standalone components + signals throughout, no NgRx — state lives in `providedIn: 'root'` services
(there are only 4 collections and a handful of screens, so a store would be overkill).

```
src/app/
  core/       auth · plan · dia · peso · conectividad · navegacion — signal-based services + firebase.providers.ts
  domain/     types (plan.types.ts), the plan seed (plan.seed.ts), and pure calc/edit logic + specs
  shell/      header, offline banner, tab bar
  features/   login · hoy · semana · peso · compra · plan · ajustes — lazy routes
  shared/     reusable pipes
```

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

The document id *is* the date (`YYYY-MM-DD`): idempotent by design, one record per day, no
compound indexes or range queries needed. This is the same schema the original vanilla app used —
do not change document shapes without a migration plan, since real data already exists under it.
Types describing this model live in `src/app/domain/plan.types.ts` and must stay in sync with
`firestore.rules`.

The plan (diet + training) is seeded from `src/app/domain/plan.seed.ts` into
`usuarios/{uid}/plan/actual` on first run, and from then on is edited **in the app** (the Plan
screen) rather than redeployed. Two consequences worth keeping in mind:

- Seeding only happens when the document does not exist *according to the server*
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
edit made on the phone shows up on the laptop without a reload.

### Security model

`firestore.rules` isolates everything by `uid` under `usuarios/{uid}`; there are no global/shared
collections on purpose (health data). Writes to `pesos/{fecha}` and `dias/{fecha}` additionally
validate the `YYYY-MM-DD` date format and, for weight, a sane numeric range. Anything outside
`usuarios/{uid}` is denied by the catch-all rule. `src/environments/environment.ts` Firebase web
keys are public by design (protection comes from the rules, not the keys) — never treat them as
secrets. The Firebase Admin service account JSON (`*-firebase-adminsdk-*.json`, matched in
`.gitignore`) must never be committed; CI gets it via the `FIREBASE_SERVICE_ACCOUNT` GitHub secret.
