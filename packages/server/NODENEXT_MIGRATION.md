# Migration Guide: CommonJS → `module: nodenext`

This guide covers converting `packages/server` from `"module": "commonjs"` / `"moduleResolution": "node"` to
`"module": "nodenext"` / `"moduleResolution": "nodenext"`.

## Why

- Eliminates the TypeScript 6 deprecation warning on `moduleResolution: node10`
- Unlocks ESM-only packages (e.g. chokidar v5)
- Aligns with Node.js native module semantics

## What `nodenext` actually means

TypeScript compiles `.ts` files to `.js` but **does not rewrite import paths**. With `nodenext`, Node.js
resolves imports exactly as written — so every local import must already include the `.js` extension (even
though the source file is `.ts`). This is the only reason the migration is mechanical: 78 import statements
need `.js` appended.

---

## Summary of changes

| Category | Count | Notes |
|---|---|---|
| Config files (`tsconfig.json`, `package.json`) | 2 | Module/resolution settings + `"type": "module"` |
| Local imports missing `.js` extension | 78 | All relative imports |
| `__dirname` / `__filename` usages | 5 occurrences in 3 files | Replace with `import.meta.url` |
| `require()` in application code | 2 | Convert to top-level imports |
| `require()` in log/error strings | 3 | Update the example commands in the strings |
| `jest.config.js` | 1 | Enable ts-jest ESM mode |

---

## Step 1 — Update `tsconfig.json`

```diff
  {
    "compilerOptions": {
-     "module": "commonjs",
-     "moduleResolution": "node",
-     "ignoreDeprecations": "6.0",
-     "esModuleInterop": true,
+     "module": "nodenext",
+     "moduleResolution": "nodenext",
      "target": "ES2022",
      "lib": ["ES2022"],
```

`esModuleInterop` becomes the default under `nodenext` so it can be removed. `ignoreDeprecations` is no
longer needed because the deprecation is resolved.

---

## Step 2 — Update `package.json`

Add `"type": "module"` at the top level. This tells Node.js to treat `.js` files in this package as ESM.

```diff
  {
    "name": "hytale-server-manager-backend",
+   "type": "module",
    "main": "dist/index.js",
```

The `dev` script uses `ts-node-dev`. Replace it with `tsx` (already handles ESM natively) or pass `--esm`:

```diff
-   "dev": "ts-node-dev --respawn --transpile-only src/index.ts",
+   "dev": "tsx watch src/index.ts",
```

If `tsx` is not already a dependency, add it: `pnpm --filter hytale-server-manager-backend add -D tsx`.

---

## Step 3 — Add `.js` to all local imports (78 files)

With `nodenext`, every relative import must end in `.js`. TypeScript understands that `./foo.js` refers to
`./foo.ts` at compile time.

**Rule:** append `.js` to any import/export path starting with `./` or `../` that does not already have an
extension.

```diff
-  import { createPrismaClient } from './lib/prisma';
+  import { createPrismaClient } from './lib/prisma.js';

-  import { requirePermission } from '../middleware/auth';
+  import { requirePermission } from '../middleware/auth.js';
```

This applies equally to re-export statements in barrel files:

```diff
-  export * from './types';
-  export { IModProvider } from './IModProvider';
+  export * from './types.js';
+  export { IModProvider } from './IModProvider.js';
```

And to dynamic imports:

```diff
-  const { modtaleApiService } = await import('../services/ModtaleApiService');
+  const { modtaleApiService } = await import('../services/ModtaleApiService.js');
```

**Mechanically:** this can be done with a sed/regex pass over `src/`:

```bash
# Dry-run first — inspect output before applying
grep -rn "from '\(\./\|\.\./\)[^']*'" src/ | grep -v "\.js'"

# Apply (GNU sed)
find src -name '*.ts' ! -name '*.d.ts' -exec sed -i \
  "s/from '\(\(\.\.\?\/\)\+[^']*\)'/from '\1.js'/g" {} +
find src -name '*.ts' ! -name '*.d.ts' -exec sed -i \
  "s/import('\(\(\.\.\?\/\)\+[^']*\)')/import('\1.js')/g" {} +
```

> **Warning:** Run `npx tsc --noEmit` immediately after to catch any double-extension accidents (e.g.
> `foo.js.js`) or missed paths.

---

## Step 4 — Replace `__dirname` / `__filename` (3 files)

`__dirname` and `__filename` are CommonJS globals — they do not exist in ESM. Add a compatibility shim near
the top of each affected file:

```typescript
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
```

Then the rest of the file can continue using `__dirname` unchanged.

### Affected locations

**`src/index.ts` — line 13**
```diff
+ import { fileURLToPath } from 'url';
+ import { dirname } from 'path';
+ const __filename = fileURLToPath(import.meta.url);
+ const __dirname = dirname(__filename);
  ...
  const logsDir = path.join(__dirname, '..', 'logs');
```

**`src/config.ts` — lines 9, 12, 239**
```diff
+ import { fileURLToPath } from 'url';
+ import { dirname } from 'path';
+ const __filename = fileURLToPath(import.meta.url);
+ const __dirname = dirname(__filename);
  ...
  : path.join(__dirname, '..', '.env');
  console.log(`[Config] __dirname: ${__dirname}`);
  ...
  return path.join(__dirname, '..');
```

**`src/app.ts` — line 221**
```diff
+ import { fileURLToPath } from 'url';
+ import { dirname } from 'path';
+ const __filename = fileURLToPath(import.meta.url);
+ const __dirname = dirname(__filename);
  ...
  cwd: path.join(__dirname, '..'),
```

---

## Step 5 — Convert `require()` calls in application code (2 locations)

### `src/routes/servers.ts` — lines 1594 and 1610

Both calls lazily load `config`. Since ESM is always statically resolved, add a proper top-level import
instead:

```diff
+ import config from '../config.js';
  ...
-   fileSize: require('../config').default.maxFileUploadSize,
+   fileSize: config.maxFileUploadSize,
  ...
-   const config = require('../config').default;
  // delete this line and use the imported config directly
```

### `src/middleware/validation.ts` — line 219

```diff
+ import path from 'path';  // move to top of file (already imported elsewhere in the file)
  ...
-   const path = require('path');
  // delete this line
```

### `src/utils/certificates.ts` — line 46

```diff
+ import { networkInterfaces } from 'os';
  ...
-   const { networkInterfaces } = require('os');
  // delete this line
```

### `require()` in error/log strings (3 locations)

These are just instructional strings in log messages — no code impact. Update them to show ESM-idiomatic
commands:

```diff
-  'Generate secrets with: node -e "console.log(require(\'crypto\').randomBytes(64).toString(\'hex\'))"'
+  'Generate secrets with: node --input-type=module -e "import crypto from \'crypto\'; console.log(crypto.randomBytes(64).toString(\'hex\'))"'
```

---

## Step 6 — Update `jest.config.js`

Jest needs to be told to treat `.ts` files as ESM and to strip `.js` extensions from imports when resolving
test modules (since Jest resolves from source, not compiled output):

```diff
- module.exports = {
-   preset: 'ts-jest',
-   testEnvironment: 'node',
-   roots: ['<rootDir>/src', '<rootDir>/tests'],
-   testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
-   transform: {
-     '^.+\\.ts$': 'ts-jest',
-   },
-   setupFilesAfterEnv: ['<rootDir>/src/test/setup.ts'],
- };
+ export default {
+   preset: 'ts-jest',
+   testEnvironment: 'node',
+   extensionsToTreatAsEsm: ['.ts'],
+   roots: ['<rootDir>/src', '<rootDir>/tests'],
+   testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
+   transform: {
+     '^.+\\.ts$': ['ts-jest', { useESM: true }],
+   },
+   moduleNameMapper: {
+     // Strip .js from local imports so Jest resolves .ts source files
+     '^(\\.{1,2}/.*)\\.js$': '$1',
+   },
+   setupFilesAfterEnv: ['<rootDir>/src/test/setup.ts'],
+   collectCoverageFrom: ['src/**/*.ts', '!src/**/*.d.ts', '!src/index.ts'],
+   coverageDirectory: 'coverage',
+   coverageReporters: ['text', 'lcov', 'html'],
+   verbose: true,
+ };
```

Note: `jest.config.js` itself becomes ESM (uses `export default`) because `package.json` now has
`"type": "module"`. Alternatively, rename it to `jest.config.cjs` and keep `module.exports` — Jest
supports both.

---

## Step 7 — Update chokidar (optional, the original motivation)

Once the project is ESM, chokidar v5 can be installed normally:

```bash
pnpm --filter hytale-server-manager-backend add chokidar@latest
```

The static import in `src/services/LogTailService.ts` works as-is after adding `.js`:

```diff
- import chokidar, { FSWatcher } from 'chokidar';
+ import chokidar, { type FSWatcher } from 'chokidar';
```

---

## Verification checklist

After completing all steps:

```bash
# 1. Type-check — must be zero errors
npx tsc --noEmit

# 2. Build — must succeed
pnpm build

# 3. Smoke-test the compiled output
node dist/index.js

# 4. Run tests
pnpm test
```

Common errors after migration and their causes:

| Error | Cause | Fix |
|---|---|---|
| `ERR_REQUIRE_ESM` at runtime | A dependency still uses `require()` somewhere | Check for lingering `require()` calls |
| `Cannot find module './foo'` | Missing `.js` extension on an import | Add `.js` |
| `__dirname is not defined` | Missed a `__dirname` usage | Add `import.meta.url` shim |
| `SyntaxError: Cannot use import statement` | A `.js` file is being treated as CJS | Check `"type": "module"` is in `package.json` |
| TS error `TS2835` on `import.meta` | `target` is too low | `target` must be `ES2020` or higher (already `ES2022`) |

---

## Scope of this guide

This guide only covers `packages/server`. The frontend (`packages/frontend`) uses Vite/bundler resolution
and is unaffected. The workspace root `package.json` does **not** need `"type": "module"`.
