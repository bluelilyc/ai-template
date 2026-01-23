# Copilot instructions

## Project overview
- AIPM is a TypeScript ESM CLI that installs template packs for Copilot/Claude. The CLI entry point is [src/cli.ts](src/cli.ts) and the library surface is [src/index.ts](src/index.ts).
- The build is a Vite library bundle targeting Node 18 with ESM output; entry points are `cli` and `index` in [vite.config.ts](vite.config.ts).

## Core architecture and flow
- `aipm install` (Commander) resolves a templates root, computes a target path, and calls `installTemplates` from [src/installer.ts](src/installer.ts).
- `installTemplates` scans a template pack via `findTemplateFiles` (agents, prompts, instructions, skills, MCP config) and copies files into the target. Copilot installs go to `.github`, Claude installs go to `.claude/<pack>` and also write `.claude-plugin/plugin.json`.
- `aipm list` uses `listTemplateManifests` and `formatTemplateTable` in [src/listing.ts](src/listing.ts).

## Template and MCP conventions
- Template packs live under [templates/](templates/) and typically include `agents/`, `prompts/`, `instructions/`, optional `skills/*.skill/`, and a `template.json` manifest (metadata only; not installed).
- MCP config files are copied as `mcp.json` for Copilot and `.mcp.json` for Claude. `mergeMcpConfig` merges only new server keys and skips invalid configs or duplicates; it never overwrites existing servers.

## Developer workflows
- Build: `npm run build` (Vite lib build). Watch: `npm run dev`.
- Tests: `npm test` (Vitest; see [tests/](tests/)).
- Typecheck: `npm run typecheck`.
- Format: `npm run format`.

## Project-specific conventions
- TypeScript uses ESM imports with explicit `.js` extensions (e.g., `./installer.js`) because the output is ESM.
- Use Node `fs/promises` and `path` helpers consistently, as in [src/installer.ts](src/installer.ts).
- Follow additional instructions under `.github/instructions/` for specific file types.
