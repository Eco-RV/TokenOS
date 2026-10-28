# Token OS

Vite + React + TypeScript SPA on Stellar testnet. Real mode: Freighter wallet + Lendara anchor
(SEP-1/10/24). No backend, no database, no env vars. UI copy in Spanish.

## Workflow

Follow `docs/FLUJO.md`: `main` (production, PRs from `dev_main` only), `dev_main` (integration),
`feature/x.y.z`. Merge commits. Never commit to `main`. Every version bumps `package.json` and adds a
`CHANGELOG.md` section; after the user merges `dev_main → main`, tag `vX.Y.Z` and create a GitHub release.
The user merges PRs in GitHub; open them and wait.

## Commands

`npm run dev` · `npm run check` (typecheck, lint, prettier) · `npm run build` · `npm run probe` (Lendara E2E with a throwaway account).

## Rules

- Visual system: `src/styles.css` (tokens at the top, palette "Nebula"). Components use tokens only, square corners, hard shadows.
- Lendara endpoints come from its `stellar.toml` at runtime; never hardcode them. API notes: `docs/lendara-api.md`.
- Open the widget popup synchronously inside the click handler (before any `await`) or the browser blocks it.
- Only accept `postMessage` from the Lendara origin; polling `/transaction` is the source of truth.
- Block real-mode actions unless Freighter is on Testnet. Never ask for or store secret keys.
