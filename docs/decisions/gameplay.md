# Gameplay & Math Decisions

"Coins: Hold & Win" — game mechanics and math decisions log. See `src/slotmath.js`, `src/wins.js`, `src/outcome.js`, `src/main.js`.

---

## IMMUTABLE: Verified pinned RTP — 0.96081525

**Decision:** The game's theoretical RTP is 0.96081525 (96.08%). This value is pinned, verified, and immutable. It must never change without a deliberate, documented decision to do so.

**Verification:** 12M-spin Monte Carlo (`npm run test:proof`). Also verified by exact payline enumeration (`verify_rtp` MCP tool). Both methods agree.

**How the pin is enforced:**

- `test:proof` (CI job) asserts the exact value within tolerance
- `npm run mutation` (mutation probe, 10/10 required) verifies the math is fully tested
- The math/test layer (slotmath.js + test files) is firewalled from Pixi/binary assets by lint rule (ADR-0021)

**Why immutable:** Any change to RTP requires re-verification at 12M spins, re-running the full gate, and an explicit decision entry here. No casual edits to `SYMBOL_WEIGHTS`, `PAYTABLE`, or pay logic without going through this.

---

## Grid — 3×3, fixed

**Decision:** 3 reels × 3 rows. Not configurable in production (configurable via `modelOverrides` in the MCP tools for hypothetical tuning analysis only).

**Why:** The Hold & Win bonus mechanic is designed around a 3×3 grid. Expanding the grid changes the game feel significantly and would require re-verifying the RTP.

**Status:** Active.

---

## Hold & Win bonus mechanic

**Decision:** The bonus game uses a Hold & Win structure: special bonus symbols lock in place, reels respun, new bonus symbols extend the hold count, until no new symbols land. Awards based on total bonus symbol values.

**Why:** Core identity of the game. The full bonus logic is in `src/outcome.js` and `monteCarloFullGame()`.

**Status:** Active.

---

## Bet system — multi-level, clampBetIndex

**Decision:** Multiple discrete bet levels (not a free-entry field). `clampBetIndex()` enforces valid range. `changeBet()` in `ui.js` handles user interaction.

**Why:** Simpler to balance RTP and house edge with fixed bet levels than free-form entry. Prevents degenerate inputs.

**Status:** Active.

---

## Balance refill — when balance < current bet

**Decision:** When the player's balance drops below the current bet, automatically refill to `ECONOMY.startBalance`.

**Why:** Play-money game — there's no point letting the player get stuck. The refill keeps the experience running without interruption.

**Status:** Active.

---

## Auto-spin — supported, toggleable

**Decision:** Auto-spin is a supported feature (`toggleAuto()` in `main.js`). Player can toggle auto-spin on/off.

**Why:** Player convenience. Not tied to any real-money wagering concern (play-money only).

**Status:** Active.

---

## Win tiers — BIGWIN thresholds

**Decision:** Wins classified into tiers based on multiplier vs bet using `winTier(mult, BIGWIN)` thresholds. Each tier triggers a different celebration response.

**Why:** Standard slot machine UX — big wins get bigger spectacle. The `BIGWIN` config object controls tier boundaries.

**Status:** Active. Planned upgrade in PR-3b (multi-stage big-win spectacle).

---

## modelOverrides — hypothetical tuning only

**Decision:** The MCP server's `modelOverrides` input allows callers to test hypothetical game configurations (different grid size, symbols, weights). These are analysis tools only — they do NOT change the shipped game.

**Bounds enforced:** reels ≤ 8, rows ≤ 8, symbols ≤ 32, enumeration ceiling 2,000,000. Fractional dimensions rejected (would cause infinite recursion in enumeration). Degenerate weights (NaN, zero-sum) rejected.

**Why:** DoS protection — without bounds, `{reels: 9}` OOM-kills Node via exponential enumeration. Found in security audit (PR-B1); CodeRabbit missed it.

**Status:** Active.

---

## Play-money only — no real wagering

**Decision:** The game is play-money only. No real money, no accounts, no payment APIs, no AI/LLM runtime in game code.

**Why:** Stated constraint from Scott. Non-negotiable. Applies to all PRs.

**Status:** Permanent.
