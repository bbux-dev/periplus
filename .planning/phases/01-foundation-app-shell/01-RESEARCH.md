# Phase 1: Foundation & App Shell — Research

**Researched:** 2026-06-15
**Domain:** React 19 + Vite 7 + TypeScript 5.9 + Tailwind CSS v4 + Dexie 4 (IndexedDB) + useLiveQuery
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
Stack is LOCKED: React + Vite + TypeScript, Dexie (IndexedDB), `useLiveQuery` for reactive reads, Tailwind + `cn` helper, heroicons.
Template directory layout required: `pages`, `components/ui`, `services`, `state/common`, `config`, `pwa`, `assets`.
`cn` helper + `Button` primitive must be present.

### Claude's Discretion
All implementation choices are at Claude's discretion — discuss phase was skipped per user setting (`workflow.skip_discuss=true`). Use the ROADMAP phase goal, success criteria, the LOCKED stack/architecture in PROJECT.md, and `.planning/codebase`/architecture-template conventions to guide decisions.

### Deferred Ideas (OUT OF SCOPE)
None — discuss phase skipped.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SETUP-01 | Single Vite 7 + React 19 + TypeScript 5.9 app scaffolds at repo root with project references (`tsconfig.json` → `tsconfig.app.json` + `tsconfig.node.json`) | `npm create vite@7 . -- --template react-ts` produces the exact 3-config structure; TypeScript must be bumped from scaffold default (~5.8) to ~5.9 |
| SETUP-02 | Tailwind CSS v4 wired via `@tailwindcss/vite` with theme tokens in `index.css`, and the template directory layout in place | Tailwind v4 confirmed: no `tailwind.config.js`, vite plugin `tailwindcss()`, CSS-first `@import "tailwindcss"` + `@theme {}` block |
| SETUP-03 | `components/ui/` contains the `cn` helper and a `Button` primitive referencing CSS custom-property theme tokens | Canonical patterns confirmed: `cn` = clsx + tailwind-merge; Button uses variant/size `Record` lookup |
| SHELL-01 | A mobile-first welcome screen renders the app title "Life Log" as the default route | Simple `BrowserRouter` + single `Route path="/"` → `<WelcomePage />` is sufficient for Phase 1 |
| DEMO-01 | A Counter with +/− heroicons, persisted in Dexie/IndexedDB, read reactively via `dexie-react-hooks` `useLiveQuery`, survives a page refresh | Dexie 4 `EntityTable` + `db.counter.put({id:1, value})` upsert pattern + `useLiveQuery(() => db.counter.get(1))` confirmed from official docs |
</phase_requirements>

---

## Summary

Phase 1 scaffolds a brand-new Vite 7 + React 19 + TypeScript 5.9 app at the repo root, then layers in Tailwind v4 (CSS-first, no `tailwind.config.js`), the required directory skeleton, `cn` + `Button` primitives, a minimal react-router-dom v7 route for the welcome screen, and a Dexie 4 counter store read reactively with `useLiveQuery`. The Dexie data layer is proven with Vitest + `fake-indexeddb`; the welcome screen is smoke-tested with Vitest + React Testing Library; TypeScript compilation and directory-layout conformance are gated by `tsc -b && vite build`. PWA (`vite-plugin-pwa`) is explicitly out of scope — Phase 1 leaves `pwa/` as an empty placeholder directory only.

**Primary recommendation:** Scaffold with `npm create vite@7 . -- --template react-ts`, bump TypeScript to `~5.9.3`, install Tailwind + Dexie + heroicons packages in one batch, then create the directory skeleton before writing any component code.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Routing / welcome screen | Browser (React Router) | — | `BrowserRouter` + `Route` — purely client-side SPA; no SSR in this stack |
| Counter state persistence | Database / Storage (IndexedDB via Dexie) | — | Counter value written via `db.counter.put()`; `useLiveQuery` subscribes to changes |
| Reactive UI updates | Browser (dexie-react-hooks) | — | `useLiveQuery` hook bridges Dexie's live-query observable into React re-renders |
| Styling / tokens | Browser (Tailwind v4 CSS) | — | `@theme` variables compiled to CSS custom properties; no runtime JS style injection |
| TypeScript type safety | Build tool (tsc) | Vite (esbuild) | `tsc -b` validates type correctness; Vite transpiles for dev speed |
| Directory scaffold | Build tool (Vite template) | — | `create-vite@7 --template react-ts` generates the tsconfig project-references structure |

---

## Standard Stack

### Core (Phase 1 production dependencies)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| react | ^19.2.7 | UI rendering | Locked by architecture-template |
| react-dom | ^19.2.7 | DOM renderer | Paired with react |
| react-router-dom | ^7.17.0 | Client-side routing | Locked by architecture-template |
| dexie | ^4.4.3 | IndexedDB wrapper | Locked by spec.md + architecture-template |
| dexie-react-hooks | ^4.4.0 | `useLiveQuery` hook | Paired with dexie; locked by architecture-template |
| @heroicons/react | ^2.2.0 | SVG icon set (+/−) | Locked by architecture-template |
| clsx | ^2.1.1 | Conditional class composition | Part of canonical `cn` helper |
| tailwind-merge | ^3.6.0 | Merge Tailwind classes without conflicts | Part of canonical `cn` helper |

### Dev / Build

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| vite | ^7.3.5 | Dev server + bundler | Locked; `create-vite@7` pins `^7.1.2`, resolves to 7.3.5 |
| @vitejs/plugin-react | ^5.0.0 | React fast-refresh + JSX transform for Vite 7 | Shipped by `create-vite@7` template; v6+ requires Vite 8 |
| typescript | ~5.9.3 | Type checking | Locked at 5.9.x; scaffold default is ~5.8.3 and must be bumped |
| tailwindcss | ^4.3.1 | CSS utility framework | Locked; CSS-first, no `tailwind.config.js` |
| @tailwindcss/vite | ^4.3.1 | Vite plugin for Tailwind v4 | Replaces PostCSS config; first-party integration |
| vitest | ^4.1.9 | Test runner | Locked by architecture-template |
| fake-indexeddb | ^6.2.5 | In-memory IndexedDB for Vitest | Standard Dexie test companion |
| @testing-library/react | ^16.3.2 | Component smoke tests | Standard RTL |
| @testing-library/jest-dom | ^6.9.1 | DOM matchers for Vitest | Pairs with RTL |
| jsdom | ^29.1.1 | DOM environment for Vitest | Required for RTL in node |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| fake-indexeddb | Playwright (real browser) | Playwright tests real refresh persistence but is slower; fake-indexeddb covers unit-level data correctness cheaply |
| clsx + tailwind-merge | cva (class-variance-authority) | CVA adds structured variant API but is an extra dep; plain Record lookup is the patrimonium convention and sufficient for Phase 1 |
| BrowserRouter (data-free API) | createBrowserRouter + RouterProvider | createBrowserRouter is the v7 recommended API for loaders/actions; BrowserRouter is simpler for Phase 1's single route |

**Installation:**

```bash
# Step 1 — scaffold (use create-vite v7 to stay on the locked Vite 7 line)
npm create vite@7 . -- --template react-ts

# Step 2 — bump TypeScript to locked version (template defaults to ~5.8.3)
npm install --save-dev typescript@~5.9.3

# Step 3 — production deps
npm install react-router-dom dexie dexie-react-hooks @heroicons/react clsx tailwind-merge

# Step 4 — Tailwind v4
npm install --save-dev tailwindcss @tailwindcss/vite

# Step 5 — test tooling
npm install --save-dev vitest jsdom fake-indexeddb @testing-library/react @testing-library/jest-dom
```

> **Note on `npm create vite@7`:** The `latest` tag for `create-vite` now resolves to v8 (Vite 8, TypeScript 6). Using `vite@7` in the create command pins the scaffolder to `create-vite@7.1.3` which generates a `package.json` with `"vite": "^7.1.2"`. This is the only reliable way to scaffold the locked stack in one step.

---

## Package Legitimacy Audit

> `slopcheck` was not installable in this environment — graceful degradation applies. All packages below are tagged `[ASSUMED]`. The planner must add a `checkpoint:human-verify` before each npm install batch.

| Package | Registry | Age | Source Repo | slopcheck | Disposition |
|---------|----------|-----|-------------|-----------|-------------|
| react | npm | ~2013 | github.com/facebook/react | unavailable | Approved [ASSUMED] |
| react-dom | npm | ~2013 | github.com/facebook/react | unavailable | Approved [ASSUMED] |
| react-router-dom | npm | ~2014 | github.com/remix-run/react-router | unavailable | Approved [ASSUMED] |
| dexie | npm | 2014 | github.com/dexie/Dexie.js | unavailable | Approved [ASSUMED] |
| dexie-react-hooks | npm | 2020 | github.com/dexie/Dexie.js | unavailable | Approved [ASSUMED] |
| @heroicons/react | npm | 2021 | github.com/tailwindlabs/heroicons | unavailable | Approved [ASSUMED] |
| clsx | npm | 2018 | github.com/lukeed/clsx | unavailable | Approved [ASSUMED] |
| tailwind-merge | npm | 2021 | github.com/dcastil/tailwind-merge | unavailable | Approved [ASSUMED] |
| tailwindcss | npm | ~2017 | github.com/tailwindlabs/tailwindcss | unavailable | Approved [ASSUMED] |
| @tailwindcss/vite | npm | ~2024 | github.com/tailwindlabs/tailwindcss | unavailable | Approved [ASSUMED] |
| vitest | npm | ~2021 | github.com/vitest-dev/vitest | unavailable | Approved [ASSUMED] |
| fake-indexeddb | npm | 2015 | github.com/dumbmatter/fakeIndexedDB | unavailable | Approved [ASSUMED] |
| @testing-library/react | npm | ~2018 | github.com/testing-library/react-testing-library | unavailable | Approved [ASSUMED] |
| @testing-library/jest-dom | npm | ~2018 | github.com/testing-library/jest-dom | unavailable | Approved [ASSUMED] |

**Packages removed due to slopcheck [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

*slopcheck was unavailable at research time. All packages are `[ASSUMED]`. Planner must gate each install batch behind a `checkpoint:human-verify` task before executing.*

*Mitigating signal (not a substitute for slopcheck): all packages above are 3+ years old with well-known maintainers and verified postinstall scripts — `npm view <pkg> scripts.postinstall` returned empty for all packages checked (dexie, dexie-react-hooks, @heroicons/react, fake-indexeddb), indicating no postinstall network activity.*

---

## Architecture Patterns

### System Architecture Diagram

```
Browser (phone-sized viewport)
        │
        ▼
  index.html → main.tsx
        │         │
        │    BrowserRouter
        │         │
        │      App.tsx
        │     (route table)
        │         │
        │    Route path="/"
        │         │
        │   WelcomePage.tsx
        │         │
        │    Counter.tsx ──────────────┐
        │    (UI layer)               │
        │                             ▼
        │                    useLiveQuery(...)
        │                    dexie-react-hooks
        │                             │
        │                         db.ts
        │                    (Dexie class, v1)
        │                             │
        │                      IndexedDB (browser)
        │                      object store: "counter"
        │                             │
        │      db.counter.put({id:1, value: N})
        │      ◄──────────────────────┘
        │      (write on +/- button click)
        │
   Tailwind v4 (CSS)
   @theme tokens → CSS custom properties
   compiled at build time by @tailwindcss/vite
```

### Recommended Project Structure (Phase 1 output)

```
/                              # repo root — single Vite app
├── index.html
├── vite.config.ts             # react() + tailwindcss() plugins; vitest test config
├── tsconfig.json              # project refs: files:[], references:[app, node]
├── tsconfig.app.json          # src/ app code: strict, bundler moduleResolution
├── tsconfig.node.json         # vite.config.ts: node env
├── eslint.config.mjs          # flat config from template
├── package.json
└── src/
    ├── main.tsx               # createRoot + BrowserRouter + <App />
    ├── App.tsx                # Routes: / → WelcomePage
    ├── index.css              # @import "tailwindcss"; @theme { tokens }
    ├── vite-env.d.ts          # from template
    ├── test-setup.ts          # import '@testing-library/jest-dom'
    ├── pages/
    │   └── WelcomePage.tsx    # "Life Log" h1 + <Counter />
    ├── components/
    │   ├── Counter.tsx        # useLiveQuery, +/- heroicon icon buttons
    │   └── ui/
    │       ├── cn.ts          # clsx + tailwind-merge
    │       └── Button.tsx     # variant/size Record pattern
    ├── services/
    │   └── db.ts              # Dexie class (counter store, schema v1)
    ├── state/
    │   └── common/            # PLACEHOLDER — empty dir (requestState etc. in Phase 2)
    ├── config/                # PLACEHOLDER — empty dir (appBrand.ts etc. in Phase 2)
    ├── pwa/                   # PLACEHOLDER — empty dir (pwaConfig.ts in Phase 2)
    └── assets/                # PLACEHOLDER — empty dir
```

**Phase 1 boundary note:** `pwa/`, `state/common/`, `config/`, and `assets/` are created as empty placeholder directories. Their contents belong to Phase 2+. Do not install `vite-plugin-pwa` in Phase 1.

---

### Pattern 1: Vite 7 + TypeScript Project References

The `create-vite@7 --template react-ts` scaffold produces a 3-config TypeScript setup out of the box. Build command is `tsc -b && vite build` (the `-b` flag triggers project-build mode with references).

```json
// tsconfig.json  — root, no source files of its own
{
  "files": [],
  "references": [
    { "path": "./tsconfig.app.json" },
    { "path": "./tsconfig.node.json" }
  ]
}
```

```json
// tsconfig.app.json  — for src/**
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "jsx": "react-jsx",
    "composite": true,
    "outDir": "dist"
  },
  "include": ["src"]
}
```

> `"composite": true` is required for project references. The scaffold generates this correctly.

---

### Pattern 2: Tailwind v4 CSS-First Configuration

No `tailwind.config.js`. No `postcss.config.js`. Everything lives in `src/index.css`.

```typescript
// vite.config.ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test-setup.ts'],
  },
})
```

> **Import from `vitest/config`** (not `vite`). This adds `test` field type-awareness without a separate `vitest.config.ts`.

```css
/* src/index.css */
@import "tailwindcss";

@theme {
  /* Color tokens — stored as full CSS values, referenced via var() */
  --color-primary: hsl(222, 89%, 40%);
  --color-primary-foreground: hsl(0, 0%, 100%);
  --color-background: hsl(0, 0%, 100%);
  --color-foreground: hsl(222, 89%, 10%);
  --color-muted: hsl(210, 40%, 96%);
  --color-border: hsl(214, 32%, 91%);

  /* Typography */
  --font-sans: system-ui, sans-serif;
}
```

> **Tailwind v3 vs v4 token referencing difference:** In v3, color tokens stored HSL channels (`--color-primary: 222 89% 40%`) and were referenced as `hsl(var(--color-primary))`. In v4, tokens hold complete values (`hsl(222, 89%, 40%)`) and are referenced as `var(--color-primary)`. The architecture template's mention of `hsl(var(...))` reflects v3 convention; adapt to v4's `var()` form.

[CITED: tailwindcss.com/blog/tailwindcss-v4]

---

### Pattern 3: Dexie Counter Store (Phase 1 tracer)

```typescript
// src/services/db.ts
import Dexie, { type EntityTable } from 'dexie';

interface Counter {
  id: number;     // fixed: always 1
  value: number;
}

class LifeLogDB extends Dexie {
  counter!: EntityTable<Counter, 'id'>;

  constructor() {
    super('LifeLogDB');
    this.version(1).stores({
      counter: 'id',  // plain key, NOT ++id (no auto-increment; we own the key)
    });
  }
}

export const db = new LifeLogDB();
```

[CITED: dexie.org/docs/Typescript]

**Schema note for Phase 2:** When Phase 2 adds `entries` and `settings` stores, increment to `this.version(2).stores({ counter: 'id', entries: 'id', settings: 'key' })`. Never mutate existing `version(1)` — always add a new version block.

---

### Pattern 4: `useLiveQuery` Reactive Counter Component

```typescript
// src/components/Counter.tsx
import { useLiveQuery } from 'dexie-react-hooks';
import { PlusIcon, MinusIcon } from '@heroicons/react/24/outline';
import { db } from '../services/db';
import { Button } from './ui/Button';

export function Counter() {
  // Third arg = default while Dexie is opening (avoids undefined flash)
  const counter = useLiveQuery(
    () => db.counter.get(1),
    [],
    { id: 1, value: 0 }
  );

  const value = counter?.value ?? 0;

  const increment = () => db.counter.put({ id: 1, value: value + 1 });
  const decrement = () => db.counter.put({ id: 1, value: value - 1 });

  return (
    <div className="flex items-center gap-4">
      <Button variant="ghost" size="icon" onClick={decrement} aria-label="decrement">
        <MinusIcon className="h-5 w-5" />
      </Button>
      <span className="text-2xl font-bold tabular-nums">{value}</span>
      <Button variant="ghost" size="icon" onClick={increment} aria-label="increment">
        <PlusIcon className="h-5 w-5" />
      </Button>
    </div>
  );
}
```

[CITED: dexie.org/docs/dexie-react-hooks/useLiveQuery()]

**Key detail:** `db.counter.put({id: 1, value: N})` is an upsert — it creates the row if `id=1` does not exist, or replaces it otherwise. No separate "initialize if not exists" logic is needed.

---

### Pattern 5: `cn` Helper + Button Primitive

```typescript
// src/components/ui/cn.ts
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
```

```typescript
// src/components/ui/Button.tsx
import { type ButtonHTMLAttributes } from 'react';
import { cn } from './cn';

const variantClasses: Record<string, string> = {
  primary:   'bg-[var(--color-primary)] text-[var(--color-primary-foreground)] hover:opacity-90',
  secondary: 'bg-transparent border border-[var(--color-border)] hover:bg-[var(--color-muted)]',
  ghost:     'bg-transparent hover:bg-[var(--color-muted)]',
};

const sizeClasses: Record<string, string> = {
  sm:   'h-8 px-3 text-sm',
  md:   'h-10 px-4',
  lg:   'h-12 px-6 text-lg',
  icon: 'h-10 w-10 p-0',
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof variantClasses;
  size?: keyof typeof sizeClasses;
}

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center rounded-md font-medium',
        'transition-colors focus-visible:outline-none focus-visible:ring-2',
        'disabled:pointer-events-none disabled:opacity-50',
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      {...props}
    />
  );
}
```

[ASSUMED] — Pattern derived from training knowledge of the shadcn/patrimonium convention. Shape matches the architecture template's "variant/size `Record` lookup" description. No CVA dependency required.

---

### Pattern 6: Heroicons Import

```typescript
// 24px outline variants — standard import path for @heroicons/react v2
import { PlusIcon, MinusIcon } from '@heroicons/react/24/outline';

// Icons accept standard SVG props including className for Tailwind sizing:
<PlusIcon className="h-5 w-5" />
```

[CITED: github.com/tailwindlabs/heroicons (search result)]

Available sub-paths: `24/outline`, `24/solid`, `20/solid`, `16/solid`. Use `24/outline` for the counter +/- buttons (hairline style, touch-friendly at 5w 5h with a 10x10 ghost button).

---

### Anti-Patterns to Avoid

- **Installing `vite-plugin-pwa` in Phase 1:** The PWA plugin adds service-worker generation to the build. Phase 1's `pwa/` directory is a placeholder only. Adding the plugin prematurely triggers manifest and SW warnings in the build and adds setup complexity that belongs to Phase 2.
- **Using Vite's `latest` tag for scaffolding:** `npm create vite@latest` now resolves to create-vite@8 which pins Vite 8 and TypeScript 6 — both wrong for the locked stack. Always use `npm create vite@7`.
- **Using `++id` for the counter store:** `++id` is auto-increment. The counter pattern needs a stable `id=1` row updated in-place. Use `id` (plain key) in the schema string.
- **Three separate `@tailwind` directives:** The v3 incantation (`@tailwind base; @tailwind components; @tailwind utilities;`) does not work in v4. Use `@import "tailwindcss"` (a single line).
- **`useLiveQuery` without a default value:** Without the third argument, `counter` is `undefined` during Dexie's async open. The component must handle `undefined` or provide a default `{id: 1, value: 0}` as the third arg to avoid a flash of undefined.
- **`hsl(var(--color-primary))` in Tailwind v4:** This v3 pattern assumes the CSS variable holds HSL channel values (e.g., `222 89% 40%`). In v4, `@theme` variables hold the full color value; reference them as `var(--color-primary)`.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Class merging | Custom string concatenation | `cn` (clsx + tailwind-merge) | Tailwind class conflicts (`bg-red-500 bg-blue-500`) require intelligent last-wins merging |
| Reactive IndexedDB reads | Manual event listeners on IDBRequest | `useLiveQuery` from dexie-react-hooks | Dexie's observable layer handles all IDB event wiring; manual subscriptions miss nested query invalidation |
| IndexedDB open/version migration | Raw `indexedDB.open()` + `onupgradeneeded` | `Dexie` class with `.version()` | Raw IDB versioning is 100+ lines of error-prone callback code |
| In-memory IndexedDB for tests | Mock the entire Dexie module | `fake-indexeddb/auto` | Module mocking breaks type safety and doesn't test actual Dexie query behavior |

**Key insight:** The IndexedDB API is low-level and event-driven; every abstraction here (Dexie, useLiveQuery, fake-indexeddb) has earned its place specifically because hand-rolling these correctly is unreasonably complex for the value gained.

---

## Common Pitfalls

### Pitfall 1: Wrong Vite Major When Scaffolding

**What goes wrong:** `npm create vite@latest` or `npm create vite` resolves to `create-vite@8.x` (Vite 8, TypeScript 6), breaking the locked stack.

**Why it happens:** The `latest` npm tag tracks the current major; Vite 8 is now current.

**How to avoid:** Use `npm create vite@7 . -- --template react-ts` explicitly. Verify `node_modules/vite/package.json` shows a 7.x version after install.

**Warning signs:** `package.json` shows `"vite": "^8.x"` or TypeScript version is `~6.0.x` after scaffolding.

---

### Pitfall 2: TypeScript Version Drift After Scaffold

**What goes wrong:** `create-vite@7.1.3` defaults to `typescript@~5.8.3`. The locked stack requires TypeScript 5.9.

**Why it happens:** The scaffolder pins the TypeScript version available when it was published (5.8); 5.9 was released later.

**How to avoid:** After scaffolding, run `npm install --save-dev typescript@~5.9.3` before any other work. Confirm `tsc --version` outputs `5.9.x`.

**Warning signs:** `tsc --version` reports `5.8.x`; new TypeScript 5.9 features (if used) generate type errors.

---

### Pitfall 3: Tailwind v4 Classes Not Applying

**What goes wrong:** Tailwind utility classes appear in JSX but elements have no styles in the browser.

**Why it happens:** Most commonly: (a) `index.css` is not imported in `main.tsx`, or (b) `tailwindcss()` plugin is missing from `vite.config.ts`, or (c) the file uses `@tailwind base; @tailwind utilities;` (v3 syntax) instead of `@import "tailwindcss"`.

**How to avoid:** Verify `import './index.css'` is present in `main.tsx`. Verify `vite.config.ts` imports `tailwindcss from '@tailwindcss/vite'` and includes it in `plugins`. Use `@import "tailwindcss";` (single line) at the top of `index.css`.

**Warning signs:** DevTools shows no Tailwind-generated CSS; elements render unstyled.

---

### Pitfall 4: IndexedDB Undefined in Vitest Node Environment

**What goes wrong:** `ReferenceError: indexedDB is not defined` or `IDBFactory is not defined` when running Dexie tests in Vitest.

**Why it happens:** Vitest runs in Node.js by default; IndexedDB is a browser API. Without `environment: 'jsdom'` or `fake-indexeddb`, the global `indexedDB` doesn't exist.

**How to avoid:** Set `test.environment: 'jsdom'` in `vite.config.ts` for RTL component tests. For pure Dexie unit tests, import `fake-indexeddb/auto` at the top of the test file (or use the explicit `IDBFactory` constructor approach). Do not rely on jsdom's stub — jsdom does not implement IndexedDB; `fake-indexeddb` is required.

**Warning signs:** Test file imports Dexie but never imports fake-indexeddb; test errors mention `IDBFactory`.

---

### Pitfall 5: Counter Row Never Initialized

**What goes wrong:** Counter shows 0 on first load but `useLiveQuery(() => db.counter.get(1))` returns `undefined` (not `{id:1, value:0}`) on fresh IndexedDB.

**Why it happens:** Dexie does not auto-populate rows. `get(1)` returns `undefined` if the row doesn't exist. Without the third `defaultResult` argument or null handling, the UI may crash.

**How to avoid:** Pass `{ id: 1, value: 0 }` as the third argument to `useLiveQuery`. The first call to `increment` or `decrement` creates the row via `put()`. Do NOT initialize the row in the Dexie constructor — Dexie's `open()` is async and constructor-time writes fail.

**Warning signs:** `TypeError: Cannot read properties of undefined (reading 'value')` in Counter component.

---

### Pitfall 6: Dexie Schema Version Collisions (Future-Proofing)

**What goes wrong:** Adding new stores to `version(1)` after data already exists in the browser throws `VersionError: The requested version (1) is older than the existing version`.

**Why it happens:** IndexedDB version numbers are persistent. Once v1 schema is committed to a browser, changing v1's store list without bumping the version number causes a version conflict.

**How to avoid:** Phase 1 defines `version(1)` with only the `counter` store. Phase 2 must add `version(2)` with the full store list (`counter`, `entries`, `settings`). Never edit an already-shipped version block.

**Warning signs:** `VersionError` or `InvalidStateError` thrown by Dexie during open in the browser after schema changes.

---

## State of the Art

| Old Approach | Current Approach | Impact on Phase 1 |
|--------------|------------------|-------------------|
| Tailwind v3 (`tailwind.config.js` + PostCSS) | Tailwind v4 CSS-first (`@import "tailwindcss"` + `@theme {}`) | No config file, no PostCSS; `@tailwindcss/vite` plugin only |
| `@tailwind base/components/utilities` directives | `@import "tailwindcss"` single import | One-line CSS setup |
| TanStack Query for server state | `useLiveQuery` (dexie-react-hooks) for local state | Stack is local-only; no server query cache needed |
| Vite config typed via `/// <reference types="vitest/config" />` + separate vitest.config | `import { defineConfig } from 'vitest/config'` in vite.config.ts | One config file handles both Vite and Vitest |
| Dexie 3 `.table<T>()` manual typing | Dexie 4 `EntityTable<T, 'id'>` generic | Cleaner TypeScript integration; no manual casting |

**Deprecated/outdated:**
- `react-scripts` / CRA: Officially deprecated; Vite is the current standard.
- `tailwind.config.js`: Still valid in v4 via `@config` directive for migration, but not needed for new projects.
- `@tailwind base; @tailwind components; @tailwind utilities;`: v3 syntax; does nothing in v4.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Button variant/size `Record` pattern (no CVA) matches the patrimonium convention described by architecture-template | Pattern 5: Button Primitive | Minor — if CVA is required, add `class-variance-authority` dep and adapt; existing API surface stays the same |
| A2 | `@vitejs/plugin-react@^5.x` (from create-vite@7 template) is compatible with Vite 7.3.x | Standard Stack | Low risk — v5 and v6 of plugin-react track their respective Vite majors; v5 is the create-vite@7 default |
| A3 | `BrowserRouter` (data-free API) from react-router-dom v7 is still exported and works for Phase 1's single route | Pattern 1 / SHELL-01 | Low — v7 retained the v6 component API; `createBrowserRouter` is the recommended new API but `BrowserRouter` continues to work |
| A4 | `fake-indexeddb/auto` works in Vitest with `environment: 'jsdom'` for Dexie component tests | Validation Architecture | Medium — there are reported Vitest-specific issues; fall back to explicit `IDBFactory` injection if auto doesn't work |
| A5 | All npm packages listed are legitimate and not slopsquatted | Package Legitimacy Audit | Low based on package age (2+ years, known maintainers) — but slopcheck was unavailable so formal verification is pending |

---

## Open Questions

1. **`@vitejs/plugin-react` version selection**
   - What we know: create-vite@7.1.3 ships `@vitejs/plugin-react@^5.0.0`; npm latest is `6.0.2` (which likely requires Vite 8)
   - What's unclear: Whether `@vitejs/plugin-react@5.x` or `6.x` works correctly with Vite 7.3.x
   - Recommendation: Stick with `^5.0.0` as provided by the create-vite@7 template. Do not upgrade plugin-react independently of vite.

2. **Vitest + fake-indexeddb compatibility under jsdom**
   - What we know: `fake-indexeddb/auto` registers `indexedDB` on `globalThis`; Vitest's jsdom environment does not provide IndexedDB natively
   - What's unclear: Whether the `fake-indexeddb/auto` side-effect import works reliably in Vitest's module isolation or requires setup file placement
   - Recommendation: Add `import 'fake-indexeddb/auto'` in `src/test-setup.ts` (before RTL setup). If issues arise, use explicit `IDBFactory` injection per the Dexie test docs (Method 2 in Pattern section).

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | npm / Vite / Vitest | ✓ | (present — npm commands ran successfully) | — |
| npm | Package install | ✓ | (present) | — |
| Browser (dev) | Manual SC1/SC4 verification | not tested | — | Use `vite preview` in CI |

**Missing dependencies with no fallback:** None — Phase 1 is purely frontend code; no external services required.

**Missing dependencies with fallback:** None.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest ^4.1.9 |
| Config file | `vite.config.ts` — `test:` block (import from `vitest/config`) |
| Quick run command | `npx vitest run` |
| Full suite command | `npx vitest run && tsc -b && vite build` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | Notes |
|--------|----------|-----------|-------------------|-------|
| SETUP-01 | TypeScript project-references scaffold produces no type errors | Build gate | `tsc -b` exits 0 | Pass/fail; no test file needed |
| SETUP-02 | Tailwind v4 config wired; directory layout present | Build gate + shell check | `vite build` exits 0; `ls src/{pages,components/ui,services,state/common,config,pwa,assets}` | Build fails if CSS import missing |
| SETUP-03 | `cn` helper composes classes; `Button` renders with correct variant | Unit — Vitest | `npx vitest run src/components/ui/cn.test.ts` | Test class string output |
| SHELL-01 | WelcomePage renders "Life Log" title | Unit — Vitest + RTL | `npx vitest run src/pages/WelcomePage.test.tsx` | `screen.getByText('Life Log')` |
| DEMO-01a | Dexie counter store: `put()` creates row; `get(1)` returns correct value | Unit — Vitest + fake-indexeddb | `npx vitest run src/services/db.test.ts` | Tests raw Dexie API; no React |
| DEMO-01b | Counter component: clicking + button increments displayed value | Unit — Vitest + RTL + fake-indexeddb | `npx vitest run src/components/Counter.test.tsx` | `useLiveQuery` exercises real Dexie reaction with fake-indexeddb |
| DEMO-01c | Counter value survives refresh (actual IndexedDB persistence) | Manual / Playwright | `vite dev` → load → click → refresh → observe | Not automatable with fake-indexeddb (in-memory only) |

### Sampling Rate

- **Per task commit:** `npx vitest run` (all unit tests; ~seconds)
- **Per wave merge:** `npx vitest run && tsc -b && vite build` (full gate)
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

All test files must be created as part of implementation:

- [ ] `src/components/ui/cn.test.ts` — covers SETUP-03 (`cn` output correctness)
- [ ] `src/pages/WelcomePage.test.tsx` — covers SHELL-01 ("Life Log" text present)
- [ ] `src/services/db.test.ts` — covers DEMO-01a (Dexie schema + put/get)
- [ ] `src/components/Counter.test.tsx` — covers DEMO-01b (reactive +/- behavior)
- [ ] `src/test-setup.ts` — `@testing-library/jest-dom` import + `fake-indexeddb/auto`
- [ ] `vitest.config.ts` (or `test:` block in `vite.config.ts`) — `environment: 'jsdom'`, `setupFiles`, `globals: true`

**DEMO-01c (cross-refresh persistence)** cannot be automated with Vitest + fake-indexeddb. It is verified manually during dev: run `vite dev`, increment counter, hard-refresh, confirm value persists. A Playwright e2e test could automate this but is not required for Phase 1's gate.

### Dexie Test Setup Pattern

```typescript
// src/test-setup.ts
import 'fake-indexeddb/auto';
import '@testing-library/jest-dom';
```

```typescript
// src/services/db.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { db } from './db';

beforeEach(async () => {
  // Delete and re-open to clear state between tests
  await db.delete();
  await db.open();
});

describe('counter store', () => {
  it('put creates a row when id=1 does not exist', async () => {
    await db.counter.put({ id: 1, value: 0 });
    const row = await db.counter.get(1);
    expect(row?.value).toBe(0);
  });

  it('put overwrites an existing row (upsert)', async () => {
    await db.counter.put({ id: 1, value: 3 });
    await db.counter.put({ id: 1, value: 7 });
    const row = await db.counter.get(1);
    expect(row?.value).toBe(7);
  });
});
```

---

## Security Domain

> Phase 1 introduces no authentication, network calls, user input, or secrets. All data is written and read from the local device's IndexedDB by the same-origin page.

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No | No auth in this prototype |
| V3 Session Management | No | No sessions |
| V4 Access Control | No | Single-user local-only |
| V5 Input Validation | Minimal | Counter value is an integer manipulated only via +/- buttons; no freeform user input in Phase 1 |
| V6 Cryptography | No | No secrets, no encryption |

No security controls required for Phase 1. The counter tracer has no user-supplied string input.

---

## Sources

### Primary (HIGH confidence)
- [dexie.org/docs/Typescript](https://dexie.org/docs/Typescript) — Dexie 4 EntityTable TypeScript pattern; `db.version().stores()` schema format
- [dexie.org/docs/dexie-react-hooks/useLiveQuery()](https://dexie.org/docs/dexie-react-hooks/useLiveQuery()) — `useLiveQuery` signature, default value arg, reactive behavior
- [tailwindcss.com/blog/tailwindcss-v4](https://tailwindcss.com/blog/tailwindcss-v4) — v4 CSS-first config, `@import "tailwindcss"`, `@theme {}`, no `tailwind.config.js`
- [github.com/vitejs/vite blob/v7.1.3/.../template-react-ts/package.json](https://github.com/vitejs/vite/blob/v7.1.3/packages/create-vite/template-react-ts/package.json) — exact versions shipped by create-vite@7.1.3 (Vite ^7.1.2, TS ~5.8.3)
- [github.com/dumbmatter/fakeIndexedDB](https://github.com/dumbmatter/fakeIndexedDB) — fake-indexeddb setup patterns with Dexie; `IDBFactory` reset pattern; version 6.2.5

### Secondary (MEDIUM confidence)
- [dev.to/josh_blair/react-vite-typescript-tailwind-css-v4-project-setup-4c34](https://dev.to/josh_blair/react-vite-typescript-tailwind-css-v4-project-setup-4c34) — Confirmed vite.config.ts + index.css Tailwind v4 wiring pattern
- [ui.shadcn.com/docs/installation/manual](https://ui.shadcn.com/docs/installation/manual) — `cn` helper implementation (clsx + tailwind-merge) as shadcn canonical
- WebSearch: `@heroicons/react` v2 import paths (`/24/outline`, `/24/solid`, etc.) confirmed via tailwindlabs/heroicons search results

### Tertiary (LOW confidence)
- None — all major claims were verified via official documentation or registry inspection.

---

## Metadata

**Confidence breakdown:**

| Area | Level | Reason |
|------|-------|--------|
| Standard stack (versions) | HIGH | All package versions verified via `npm view` against the registry |
| Scaffold procedure | HIGH | create-vite@7 tag confirmed on npm; template package.json verified via GitHub |
| Tailwind v4 setup | HIGH | Official tailwindcss.com blog + confirmed with third-party guide |
| Dexie 4 patterns | HIGH | Official dexie.org docs read directly |
| useLiveQuery pattern | HIGH | Official dexie.org docs read directly |
| Button/cn patterns | MEDIUM | Architecture template describes the shape; exact code is [ASSUMED] from training knowledge of shadcn convention |
| Vitest + fake-indexeddb integration | MEDIUM | GitHub README confirmed approach; jsdom compatibility is [ASSUMED] — one known issue reported in Vitest discussions |
| Cross-refresh persistence (SC4) | LOW | Not testable with Vitest; manual verification only — this is a gap in automated validation coverage |

**Research date:** 2026-06-15
**Valid until:** 2026-07-15 (30 days — Tailwind and Vite minor versions may shift, but patterns are stable)
