# Contributing

Thanks for hacking on **Coins: Hold & Win**. This repo is set up to be worked on
by both humans and AI agents — the full contract is in [`AGENTS.md`](AGENTS.md).

## Quick start

```bash
npm install
npm run dev        # play it locally (HMR)
```

## Before you open a PR

```bash
npm run format     # prettier
npm run lint       # eslint
npm test           # vitest unit tests
npm run build      # production build
```

For behavior/render changes, also run the smoke test:

```bash
npm run build && npm run preview &
node verify.mjs
```

## Conventions

- Branch off `main`; never commit straight to it. Open a **draft PR**.
- Imperative commit subjects + a short "why" body.
- Put tunables in `src/config.js`; keep pure logic Pixi-free so it stays
  unit-testable.
- Record significant decisions as an **ADR** (`docs/adr/`), gotchas in
  **`docs/LEARNINGS.md`**, and behavior changes in **`docs/SPEC.md`**.
- The **drift-audit** workflow comments on every PR; address high-severity flags.
- AI agents: prefer the predefined subagent roles in `.claude/agents/`
  (auditor, explorer, planner) over ad-hoc prompts.

## Working Agreement

The four rules in [`AGENTS.md`](AGENTS.md#working-agreement-applies-to-humans-and-every-agentsubagent)
apply to everyone: don't declare things impossible without researching, document
findings, look up known edge cases when stuck, and never cut scope to save time.
