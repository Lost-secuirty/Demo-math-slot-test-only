# Security Policy

This is a **play-money entertainment demo** — no accounts, no payments, no real
wagering, no personal data, and no backend. The attack surface is a static
client-side bundle.

## Reporting

If you find a security issue (e.g. a dependency vulnerability or an XSS vector in
the build), please open a private report via GitHub Security Advisories on this
repo, or email the maintainer. Please don't file public issues for exploitable
vulnerabilities until they're fixed.

## Dependencies

- `npm audit` runs are reviewed; Dependabot opens weekly update PRs.
- No secrets are required to run or build the project. CI uses only the built-in
  `GITHUB_TOKEN`.

## Secrets & personal-tier gate (cross-repo standard)

This demo stores no personal data, but the cross-repo guardrails still apply so nothing
sensitive lands here by accident:

- **Secret/PII pre-commit gate** — `tools/scan_staged.py` + `.githooks/pre-commit`
  hard-block staged secrets and personal-tier paths (`PERSONAL_JOURNAL*`, `private/`)
  and warn on PII. Activate per clone: `git config core.hooksPath .githooks`.
- **CI backstop** — `.github/workflows/scan.yml` runs the same scan on every PR
  (fork-gated, `GITHUB_TOKEN` only), alongside the drift audit.
- **Editing guard** — `.claude/hooks/guard.sh` also denies agent edits to those paths.

If a secret ever reaches git: rotate/revoke it first, then purge history and force-push.
