# Copilot instructions

## Project overview
- AIPM is a TypeScript ESM CLI that manages VS Code agent plugin marketplaces and installs plugins for Copilot/Claude. The CLI entry point is [src/cli.ts](src/cli.ts) and the library surface is [src/index.ts](src/index.ts).
- The build is a Vite library bundle targeting Node 18 with ESM output; entry points are `cli` and `index` in [vite.config.ts](vite.config.ts).

## Core architecture and flow
- `aipm marketplace add|list|sync` manages workspace-local marketplace state under `.aipm/settings.json` and `.aipm/cache/marketplaces`.
- `aipm plugin list|installed|install|update|remove` uses marketplace parsing, install planning, and tracked install records to manage plugins across `.github` and `.claude`.

## Marketplace and plugin conventions
- Marketplaces are Git repositories with `.github/plugin/marketplace.json`; plugin roots resolve from `metadata.pluginRoot` plus each plugin entry's `source` field.
- Plugin manifests are loaded from the recognized VS Code-compatible paths, including `.claude-plugin/plugin.json`.
- Copilot installs materialize into `.github`; Claude installs materialize under `.claude/<plugin-name>`.

## Developer workflows
- Build: `npm run build` (Vite lib build). Watch: `npm run dev`.
- Tests: `npm test` (Vitest; see [tests/](tests/)).
- Typecheck: `npm run typecheck`.
- Format: `npm run format`.

## Project-specific conventions
- TypeScript uses ESM imports with explicit `.js` extensions (e.g., `./installer.js`) because the output is ESM.
- Use Node `fs/promises` and `path` helpers consistently across marketplace sync, listing, and plugin install flows.
- Follow additional instructions under `.github/instructions/` for specific file types.
