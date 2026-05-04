# AIPM Marketplace Parser Spec

## Purpose

This document defines the initial parser contract for AIPM's marketplace migration.

It is intentionally narrower than the full public ecosystem. The first supported source is the Blue Lily marketplace shape observed in `marketplace.json`, interpreted through the VS Code agent plugin model.

## Scope

- workspace-local state is stored in `.aipm/settings.json`
- marketplace sources are Git repositories
- marketplace metadata is read from `.github/plugin/marketplace.json`
- plugin content is resolved from `metadata.pluginRoot` plus each plugin entry's `source`
- plugins are parsed using VS Code-compatible plugin manifests
- both `.github` and `.claude` install targets are supported

## Parser Inputs

### AIPM settings

Path:

- `.aipm/settings.json`

Required top-level fields:

- `version`
- `marketplaces`
- `plugins`

Supported marketplace record fields:

- `name`
- `source`
- `resolvedSource`
- `localPath`
- `lastSyncedAt`

Supported installed plugin record fields:

- `name`
- `version`
- `marketplace`
- `target`
- `sourceType`
- `pluginPath`
- `installedAt`
- `manifest`
- `installedFiles`

### Marketplace manifest

Path:

- `.github/plugin/marketplace.json`

Required top-level fields:

- `name: string`
- `owner: { name: string }`
- `metadata: { description: string, version: string, pluginRoot: string }`
- `plugins: MarketplacePluginEntry[]`

Supported plugin entry fields:

- `name: string`
- `source: string`
- `description?: string`
- `version?: string`
- `author?: { name: string, email?: string, url?: string }`
- `category?: string`
- `tags?: string[]`
- `strict?: boolean`

Unknown fields:

- preserved when possible in memory
- ignored by validation unless they conflict with required field types

### Plugin manifest

Recognized manifest locations, in load order:

1. `.plugin/plugin.json`
2. `plugin.json`
3. `.github/plugin/plugin.json`
4. `.claude-plugin/plugin.json`

Required fields:

- `name: string`

Supported fields for initial implementation:

- `description?: string`
- `version?: string`
- `author?: { name: string, email?: string, url?: string }`
- `skills?: string | string[]`
- `agents?: string | string[]`
- `hooks?: string | object`
- `mcpServers?: string | object`
- `dependencies?: Array<{ name: string, version?: string }>`

Initial implementation note:

- `dependencies` is included because it appears in the first marketplace AIPM must support, even though it is not listed on the VS Code documentation summary page.

## Validation Rules

### Plugin names

- must be lowercase kebab-case
- may contain only `a-z`, `0-9`, and `-`
- must not exceed 64 characters

### Marketplace plugin entries

- `name` and `source` are required
- `source` is resolved relative to `metadata.pluginRoot`
- duplicate plugin names within one marketplace are invalid

### Plugin manifests

- `name` is required
- path-valued fields may be relative and are resolved from the plugin root
- string-or-array path fields are normalized to arrays internally
- manifests using `.claude-plugin/plugin.json` are accepted for VS Code compatibility

### Settings file

- missing settings file initializes to defaults
- invalid JSON or structurally invalid settings fail fast with a parse error
- future versions must migrate through explicit schema upgrades

## Path Resolution

Marketplace plugin root resolution:

1. locate `.github/plugin/marketplace.json`
2. read `metadata.pluginRoot`
3. for each plugin entry, resolve plugin root as `<marketplace repo>/<pluginRoot>/<plugin.source>`
4. locate the plugin manifest using the recognized manifest path order

Plugin asset resolution:

- `agents` paths resolve relative to the plugin root
- `skills` paths resolve relative to the plugin root
- string `hooks` values resolve relative to the plugin root
- string `mcpServers` values resolve relative to the plugin root
- inline `hooks` and `mcpServers` objects are retained as inline manifest data until install planning materializes them

## Metadata Precedence Rules

These rules apply when marketplace entry metadata and `plugin.json` metadata disagree.

### Install identity

- authoritative source: `plugin.json`
- fields: `name`, `version`

Reason:

- install and update logic must bind to the plugin bundle that is actually copied, not only the marketplace catalog row.

### Marketplace display metadata

- preferred source: marketplace entry
- fallback source: `plugin.json`
- fields: `description`, `author`, `category`, `tags`, `strict`

Reason:

- marketplace entries are the catalog surface and may intentionally enrich search and listing metadata beyond the plugin manifest.

### Dependency metadata

- authoritative source: `plugin.json`

Reason:

- dependency declarations belong to the plugin bundle contract rather than the marketplace listing.

### Version mismatch handling

- default behavior: warn when marketplace entry version and `plugin.json` version differ
- install and update decisions use the `plugin.json` version
- `aipm plugin list` may display both values when they differ, or mark the row as mismatched

### Name mismatch handling

- fail validation if marketplace entry `name` and `plugin.json` `name` differ

Reason:

- a name mismatch breaks identity, dependency resolution, and uninstall tracking.

## Conflict Policy

- unmanaged target files are never overwritten silently
- managed files with local modifications trigger a prompt by default
- `--force` suppresses the prompt and proceeds
- every install writes an `installedFiles` ownership list to `.aipm/settings.json`

## Initial Error Policy

- invalid marketplace manifest: fail marketplace sync
- missing plugin directory for a declared marketplace entry: mark the plugin unavailable and report it
- missing plugin manifest in a declared plugin directory: mark the plugin invalid and report it
- invalid plugin manifest: skip installation for that plugin and report the reason
- dependency version mismatch: warn during listing and installation; do not silently rewrite dependency metadata

## Initial Test Cases

- parse missing `.aipm/settings.json` as defaults
- reject structurally invalid settings
- parse Blue Lily-style `marketplace.json`
- resolve plugin root from `metadata.pluginRoot` plus `plugin.source`
- accept `.claude-plugin/plugin.json` as a valid plugin manifest location
- normalize string and array path fields in `plugin.json`
- detect marketplace versus plugin manifest version mismatches
- fail on marketplace name versus plugin manifest name mismatch
