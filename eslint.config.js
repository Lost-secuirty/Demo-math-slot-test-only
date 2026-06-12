import js from '@eslint/js';
import globals from 'globals';
import prettier from 'eslint-config-prettier';
import security from 'eslint-plugin-security';

// Footgun rules — lessons from docs/LEARNINGS.md promoted to executable
// checks (a lesson isn't learned until a machine enforces it). Each entry
// cites the dated LEARNINGS entry it came from. AST selectors, so comments
// and strings can't false-positive. All had ZERO hits when introduced.
//
// SCOPE (read before trusting these as a wall — they're a tripwire for the
// COMMON form, not exhaustive). Known-uncovered evasions, by design:
//   - `el.addEventListener('pointermove', …)` — only `.on(` is matched, not
//     Pixi v8's other listener API.
//   - `generateTexture({ frame: f })` where `f` is a variable — only an
//     inline object literal is matched.
//   - `globalThis.localStorage` / `self.localStorage` — only bare
//     `localStorage` and `window.localStorage` are matched.
// These don't exist today; widen the selectors here (and the fixtures in
// test/eslint-footguns.test.js) if one ever shows up. The regression test is
// what keeps these selectors honest after a flat-config refactor.
const pixiFootguns = [
  {
    // LEARNINGS 2026-06-11: Pixi v8 fires plain 'pointermove' only while the
    // pointer is over an interactive object — fast drags off the knob stall.
    selector: "CallExpression[callee.property.name='on'][arguments.0.value='pointermove']",
    message:
      "Pixi v8: 'pointermove' only fires over interactive objects — use 'globalpointermove' for drag tracking (docs/LEARNINGS.md 2026-06-11).",
  },
  {
    // LEARNINGS 2026-06-01: generateTexture({ frame }) needs a Rectangle
    // instance; a plain object throws `e.frame?.copyTo is not a function`.
    selector:
      "CallExpression[callee.property.name='generateTexture'] > ObjectExpression > Property[key.name='frame'] > ObjectExpression",
    message:
      'Pixi v8: generateTexture frame must be a `new Rectangle(...)`, not a plain object — it throws at runtime (docs/LEARNINGS.md 2026-06-01).',
  },
];

// LEARNINGS 2026-06-11: src/persist.js is the ONLY localStorage module
// (wrapped access, private-mode safe, Pixi-free). Everything else goes
// through it so the storage seam stays unit-testable.
const storageFootguns = [
  {
    selector: "MemberExpression[object.name='window'][property.name='localStorage']",
    message:
      'localStorage is only touched by src/persist.js — route storage through it (docs/LEARNINGS.md 2026-06-11).',
  },
];

export default [
  { ignores: ['dist', 'node_modules'] },
  js.configs.recommended,
  security.configs.recommended,
  {
    files: ['**/*.{js,mjs}'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: { ...globals.browser, ...globals.node },
    },
    rules: {
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'no-console': 'off',
      // Dynamic symbol/paytable maps are core domain data, not attacker-controlled keys.
      'security/detect-object-injection': 'off',
    },
  },
  // persist.js is exempt from the storage rules only — flat config replaces
  // (not merges) a rule's options when blocks overlap, so the pixi selectors
  // are repeated in both blocks rather than split across them.
  {
    files: ['src/**/*.js'],
    rules: {
      'no-restricted-syntax': ['error', ...pixiFootguns],
    },
  },
  {
    files: ['src/**/*.js'],
    ignores: ['src/persist.js'],
    rules: {
      'no-restricted-syntax': ['error', ...pixiFootguns, ...storageFootguns],
      'no-restricted-globals': [
        'error',
        {
          name: 'localStorage',
          message:
            'localStorage is only touched by src/persist.js — route storage through it (docs/LEARNINGS.md 2026-06-11).',
        },
      ],
    },
  },
  prettier,
];
