# Changelog

All notable changes to this project are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/);
this project is a demo and is not formally versioned.

## [Unreleased]

### Added

- **The slot** — "Coins: Hold & Win", a Playson-style 3×3 PixiJS v8 (WebGL) slot:
  procedural glossy symbols, deterministic motion-blurred reels, 5 paylines,
  line-win celebrations (glow / particles / shake / rolling count-up), the Hold &
  Win bonus (locking coins, respins, MINI→GRAND jackpots), auto-spin/attract, and
  procedural WebAudio SFX.
- **Self-serve testing** — in-app debug panel (`?debug=1`/backtick: force
  WIN/BIG/MEGA/EPIC/BONUS, live sliders, theme switcher, FPS meter); GitHub Pages
  deploy with downloadable-artifact fallback.
- **Verification** — Vitest unit/golden tests (wins, outcome, config, utils) and a
  Playwright behavioral smoke test (`verify.mjs`) that asserts wins pay and the
  bonus awards, not just "no console errors".
- **Agent harness** — `AGENTS.md` (canonical contract) + `CLAUDE.md`; subagents
  (auditor/explorer/planner) and commands (`/audit`, `/verify`, `/ship`, `/adr`);
  hooks for session setup, format-on-edit, sensitive-file guard, and a local
  hook-event log.
- **Docs** — ADRs (`docs/adr/`), `docs/SPEC.md`, `docs/LEARNINGS.md`,
  `docs/DRIFT-AUDIT.md`, and `docs/AGENT-SCAFFOLDING.md` (incl. the upgrade-ROI
  policy and the professional logging/observability flow).
- **CI & governance** — drift-audit workflow (no API key), lint+test+build gate,
  PR template, CONTRIBUTING, LICENSE (MIT), CODEOWNERS, SECURITY, Dependabot.

### Security

- Bumped `vitest` to 4.1.8 to clear the critical UI-server advisory
  (GHSA-5xrq-8626-4rwp); the affected `--ui` server is not used.
