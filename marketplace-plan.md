# AIPM Marketplace Migration Plan

## Goal

Convert AIPM from a built-in template-pack installer into a workspace-scoped CLI package manager for VS Code agent plugins and plugin marketplaces, aligned with the VS Code agent plugin and marketplace specifications.

The end state is:

- `aipm` stores workspace state in `.aipm/settings.json`.
- users register one or more plugin marketplaces in that settings file.
- `aipm` can list marketplace plugins, list installed plugins, and install, update, or remove plugins.
- installing a plugin records the plugin manifest plus marketplace provenance in `.aipm/settings.json` and materializes the plugin's declared contents into the workspace `.github/` or `.claude/` customization surface.

## Confirmed Scope Decisions

- AIPM must support both `.github` and `.claude` install targets.
- AIPM should implement the VS Code agent plugin model only for now.
- existing `prompts/` support should be treated as a migration concern, not a first-class target in the new design.
- bundled samples should remain only as internal test fixtures, not as a user-facing install source.
- when an install or update would overwrite locally modified managed content, AIPM should prompt by default and allow `--force` to bypass the prompt.

## Current State Summary

The current implementation is built around local template packs bundled inside the npm package:

- `aipm install` installs one or more directories from `templates/` into `.github/` or `.claude/`.
- `aipm list` enumerates local `template.json` manifests under `templates/`.
- installation logic in `src/installer.ts` scans fixed directories and file suffixes (`agents`, `prompts`, `instructions`, `skills/*.skill`, `mcp.json`, `.mcp.json`) and copies them directly.
- tests only cover template-pack discovery, manifest reads, table formatting, and direct file copy behavior.

That architecture does not yet model:

- marketplace repositories
- marketplace manifests
- plugin manifests at `plugin.json`
- workspace-local install state in `.aipm/settings.json`
- install provenance, update detection, or uninstall cleanup
- the VS Code plugin content model, especially hooks and marketplace-driven plugin discovery

## Spec-Driven Target Model

Based on the VS Code agent plugin documentation, AIPM should treat plugins as bundles rooted by `plugin.json`, with optional paths for:

- agents
- skills
- hooks
- MCP servers

Relevant constraints from the spec:

- `plugin.json` is the canonical plugin manifest.
- plugin `name` must be kebab-case and stable.
- plugin `version` is the update identity.
- plugin marketplaces are Git repositories configured via marketplace sources.
- plugins may expose hooks and MCP servers, so install flows need explicit trust messaging and conservative validation.

Important migration note:

- the current repo is centered on `prompts/` and `instructions/`, but the new target model should pivot to plugin-spec-native assets such as agents, skills, hooks, slash commands, and MCP servers.

## Initial Marketplace Baseline

The first marketplace AIPM should support is the Blue Lily marketplace rooted by `marketplace.json` at `.github/plugin/marketplace.json`, with plugin directories resolved from `metadata.pluginRoot` plus each plugin entry's `source` field.

Observed marketplace shape from the reference repository:

- top-level `name`
- top-level `owner`
- top-level `metadata` with `description`, `version`, and `pluginRoot`
- `plugins[]` entries with `name`, `source`, `description`, `version`, `author`, `category`, `tags`, and `strict`

Observed plugin shape from the referenced plugins:

- plugins are stored under `marketplace/copilot/plugins/<source>/`
- manifests are currently located at `.claude-plugin/plugin.json`
- manifests include `name`, `description`, `version`, `author`, `agents`, `skills`, optional `hooks`, and `dependencies`

This observed schema should be the implementation baseline for AIPM's first marketplace integration, even where the public VS Code page is less explicit.

## Proposed Workspace State

Store all AIPM-managed state in `.aipm/settings.json` at the workspace root.

Suggested initial schema:

```json
{
  "version": 1,
  "marketplaces": [
    {
      "name": "awesome-copilot",
      "source": "github/awesome-copilot",
      "resolvedSource": "https://github.com/github/awesome-copilot.git",
      "localPath": ".aipm/cache/marketplaces/awesome-copilot",
      "lastSyncedAt": "2026-05-04T00:00:00.000Z"
    }
  ],
  "plugins": [
    {
      "name": "quality-engineer",
      "version": "1.2.3",
      "marketplace": "awesome-copilot",
      "target": "copilot",
      "sourceType": "marketplace",
      "pluginPath": ".aipm/cache/marketplaces/awesome-copilot/plugins/quality-engineer",
      "installedAt": "2026-05-04T00:00:00.000Z",
      "manifest": {
        "name": "quality-engineer",
        "version": "1.2.3",
        "description": "Quality engineering tools"
      },
      "installedFiles": [
        ".github/agents/quality-engineer.agent.md"
      ]
    }
  ]
}
```

Notes:

- `version` on the settings file supports future schema migration.
- `manifest` should preserve the installed `plugin.json` data so listing installed plugins does not require re-reading marketplace state.
- `installedFiles` is needed for reliable removal and conflict detection.
- `target` is required because the same plugin may be installable into `.github` or `.claude`, with different on-disk layouts.
- `localPath` and `pluginPath` can be workspace-relative in the JSON, but should be resolved to absolute paths internally.

## Proposed CLI Surface

Replace the current template-pack-oriented commands with marketplace-oriented commands.

Recommended commands:

1. `aipm marketplace add <source>`
2. `aipm marketplace list`
3. `aipm marketplace sync [name]`
4. `aipm marketplace remove <name>`
5. `aipm plugin list [--target <copilot|claude>]`
6. `aipm plugin installed [--target <copilot|claude>]`
7. `aipm plugin install <plugin> [--marketplace <name>] [--target <copilot|claude>]`
8. `aipm plugin update <plugin|--all> [--target <copilot|claude>]`
9. `aipm plugin remove <plugin> [--target <copilot|claude>]`

Compatibility option:

- keep `aipm list` and `aipm install` temporarily as deprecated aliases mapped to the new plugin commands, or remove them in a breaking major release.

## Proposed Internal Architecture

Refactor the current `installer.ts` and `listing.ts` split into services that match the new domain.

Suggested modules:

- `src/settings.ts`
  - read, initialize, validate, and write `.aipm/settings.json`
- `src/marketplaces.ts`
  - normalize marketplace sources
  - clone or pull marketplace repositories into `.aipm/cache/marketplaces/...`
  - enumerate plugins available in each marketplace
- `src/plugins.ts`
  - load and validate `plugin.json`
  - resolve declared content paths
  - compute install plans and update availability
- `src/install.ts`
  - copy plugin assets into `.github/` or `.claude/`
  - track written files
  - remove previously installed plugin files
  - prompt before overwriting locally modified managed files and allow `--force` to proceed non-interactively
  - guard against overwriting unmanaged files without confirmation or `--force`
- `src/tables.ts`
  - shared table formatting for marketplace and installed plugin listings
- `src/types.ts`
  - replace template-pack types with settings, marketplace, plugin, and install record types

This should reduce the current coupling where `installer.ts` both discovers content and performs install side effects.

## Install / Update / Remove Flow

### Install

1. Load `.aipm/settings.json`, creating it if missing.
2. Resolve the requested marketplace and sync it if stale or missing.
3. Discover the target plugin from marketplace metadata.
4. Read and validate the plugin's `plugin.json`.
5. Build an install plan from the manifest, including agents paths, skills paths, hooks path or inline hook config, MCP server path or inline config, and slash-command-compatible assets when applicable.
6. If the plan would overwrite locally modified managed files, prompt for confirmation unless `--force` was supplied.
7. Copy plugin assets into the selected target surface in spec-aligned destinations.
8. Record the installed plugin, source marketplace, manifest, and installed file list in `.aipm/settings.json`.

### Update

1. Sync marketplace data.
2. Compare installed plugin version against the marketplace plugin version.
3. If changed, detect whether any managed target files have local modifications.
4. Prompt for confirmation before overwriting those files unless `--force` was supplied.
5. Remove previously managed files for that plugin.
6. Reinstall from the new plugin version.
7. Update the stored manifest, version, and installed file list.

### Remove

1. Look up the plugin install record in `.aipm/settings.json`.
2. Delete only files recorded in `installedFiles`.
3. Optionally prune empty directories under `.github/`.
4. Remove the plugin record from `.aipm/settings.json`.

## Content Mapping Strategy

The implementation needs a deterministic mapping from plugin manifest declarations to workspace target paths.

Recommended rule set:

- directory-valued manifest entries are copied recursively into the corresponding target child directory.
- file-valued manifest entries are copied to the expected target file path.
- inline manifest objects are materialized into generated files only when the spec allows inline content and the workspace surface requires a file.
- any asset copied into `.github/` must be recorded in `installedFiles`.

Target-specific notes:

- Copilot installs should materialize into `.github/` using VS Code-compatible workspace customization locations.
- Claude installs should materialize into `.claude/`, preserving the plugin-format requirements that matter for local discovery and execution.
- prompt files should not remain a first-class output category in the new design; existing prompt assets should be migrated to supported plugin constructs.

Open technical point:

- the exact destination layout for hooks and slash-command-compatible assets still needs to be confirmed against the current workspace customization layout, because the VS Code plugin spec defines plugin bundle structure, not necessarily every flattened workspace copy rule AIPM will implement.

## Migration Plan By Phase

### Phase 1: Define the new domain model

- replace template-pack-centric types in `src/types.ts`
- define settings file interfaces and runtime validators
- define marketplace source normalization rules
- define plugin manifest validator aligned to `plugin.json`

### Phase 2: Add workspace settings management

- implement `.aipm/settings.json` creation and persistence
- add helpers for reading, writing, and schema migration
- add tests for missing file, invalid JSON, and schema upgrades

### Phase 3: Add marketplace repository support

- support marketplace source registration and listing
- clone or update marketplace repositories into `.aipm/cache/marketplaces`
- detect and read marketplace plugin entries, starting with the Blue Lily `marketplace.json` shape
- explicitly constrain source handling to the VS Code-compatible marketplace flow for now
- add tests around source normalization, cache layout, and sync behavior

### Phase 4: Replace template discovery with plugin discovery

- stop scanning bundled `templates/` as the primary source
- read `plugin.json` for each discovered plugin
- validate plugin names, versions, and declared content paths
- add table output with `Plugin`, `Version`, and `Description`

### Phase 5: Implement install records and install planner

- compute managed file lists before writing
- record marketplace provenance and manifest snapshots in `.aipm/settings.json`
- detect file conflicts with existing unmanaged `.github/` content
- add a dry-run mode if feasible

### Phase 6: Implement install, update, and remove

- install plugin contents into `.github/` and `.claude/`
- update installed plugins from marketplaces
- remove installed plugins using tracked file ownership
- add tests for reinstall, update, rollback-on-failure, and uninstall cleanup

### Phase 7: Update CLI and docs

- redesign `src/cli.ts` around `marketplace` and `plugin` subcommands
- update `README.md`, package description, and examples
- document security implications for hooks and MCP servers
- convert bundled `templates/` into internal fixtures or sample test data only, not end-user install content

## Testing Strategy

Current tests are too narrow for the new behavior. Add coverage for:

- settings file initialization and schema validation
- marketplace source parsing and cache paths
- marketplace sync behavior with local fixture repositories
- plugin manifest parsing and invalid manifest rejection
- available plugin listing with name, version, and description
- installed plugin listing from `.aipm/settings.json`
- install conflict detection
- install/update/remove lifecycle
- inline versus file-path hook and MCP manifest cases
- partial failure cleanup behavior

Prefer fixture-based tests under `tests/fixtures/marketplaces/...` rather than continuing to rely on the current `templates/` shape.

The Blue Lily marketplace structure should be captured as an initial fixture because it is the first concrete marketplace AIPM is expected to support.

## Proposed File-Level Changes

- `src/cli.ts`: replace `install` and `list` template-pack commands with marketplace and plugin commands
- `src/installer.ts`: either remove or repurpose into install-plan execution only
- `src/listing.ts`: replace template listing with plugin and installed-plugin table formatting
- `src/types.ts`: replace template types with settings, marketplace, plugin, and install record types
- `src/index.ts`: export the new public surface
- `tests/installer.test.ts`: replace with install lifecycle tests
- `tests/listing.test.ts`: replace with marketplace and installed-plugin listing tests
- `README.md`: rewrite around marketplaces, `.aipm/settings.json`, and plugin lifecycle commands
- `templates/`: remove from user-facing package payload or convert to internal-only test fixtures

## Risks And Decisions

1. Marketplace documentation gap: the VS Code documentation references marketplace repositories but does not fully define the `marketplace.json` schema shown by the Blue Lily example, so AIPM needs an explicit parser contract for the observed fields.
2. Manifest location mismatch: the Blue Lily marketplace points to plugins that use `.claude-plugin/plugin.json`, while the VS Code page presents root-level `plugin.json` as the default Copilot format and `.claude-plugin/plugin.json` as Claude format.
3. Manifest field mismatch: the reference plugins use a `dependencies` field that is not described on the VS Code page's summary of supported `plugin.json` fields.
4. Version consistency risk: the Blue Lily marketplace contains version mismatches between marketplace entries and plugin manifests, so AIPM must define which source wins during list, install, and update checks.
5. Claude layout differences: Copilot and Claude do not use identical on-disk plugin layouts, so target-specific install planning is required.
6. Conflict handling policy: uninstall and update are only safe if AIPM tracks ownership of written files and refuses to remove unmanaged files.
7. Security posture: plugin hooks and MCP servers execute code, so install flows should print the marketplace source and plugin metadata before writing anything.

## Remaining Open Questions

1. When marketplace entry metadata and `plugin.json` metadata disagree, should AIPM fail validation, warn and prefer `plugin.json`, or allow marketplace metadata to override specific display fields?

## Recommended Implementation Order

1. Lock the settings schema and marketplace scope.
2. Implement settings and marketplace sync services.
3. Implement plugin manifest loading and listing.
4. Implement tracked install and remove.
5. Implement update logic.
6. Rewrite CLI commands.
7. Rewrite docs and fixtures.

This order keeps the highest-risk unknowns at the front and avoids rewriting copy logic before the source-of-truth data model is stable.
