# AIPM (AI Package Manager)

AIPM is a TypeScript CLI for managing VS Code agent plugin marketplaces and installing plugins into workspace-local GitHub Copilot or Claude customizations.

## Installation

```bash
npm install -g aipm
```

Or run it with `npx`:

```bash
npx aipm marketplace list
```

## Usage

### Add a Marketplace

Register and sync a marketplace into `.aipm/cache/marketplaces`:

```bash
aipm marketplace add anthropics/claude-code
```

List configured marketplaces:

```bash
aipm marketplace list
```

Sync one marketplace or all configured marketplaces:

```bash
aipm marketplace sync
aipm marketplace sync bluelilyc-tools
```

### Browse Available Plugins

List plugins from all configured marketplaces:

```bash
aipm plugin list
```

Filter plugin listing to a single marketplace:

```bash
aipm plugin list --marketplace bluelilyc-tools
```

### Install a Plugin

Install into GitHub Copilot workspace customizations:

```bash
aipm plugin install core --target copilot
```

Install into Claude workspace customizations:

```bash
aipm plugin install core --target claude
```

Skip overwrite confirmation prompts:

```bash
aipm plugin install core --target copilot --force
```

### List Installed Plugins

```bash
aipm plugin installed
```

### Update Installed Plugins

Update all installed plugins:

```bash
aipm plugin update
```

Update a single plugin:

```bash
aipm plugin update core
```

### Remove an Installed Plugin

```bash
aipm plugin remove core --target copilot
```

## Workspace State

AIPM stores workspace-local state in `.aipm/settings.json` and syncs configured marketplace repositories under `.aipm/cache/marketplaces/`.

Each installed plugin record tracks:

- plugin name and installed version
- source marketplace
- selected target (`copilot` or `claude`)
- cached plugin path
- installed file ownership for safe updates and removals

## Supported Marketplace Model

AIPM currently targets the VS Code agent plugin model. It supports marketplace repositories that expose `.github/plugin/marketplace.json`, with plugin roots resolved from `metadata.pluginRoot` plus each plugin entry's `source` field.

Plugin manifests are discovered using the recognized VS Code-compatible manifest locations, including `.claude-plugin/plugin.json`.

## Install Targets

### GitHub Copilot

For `--target copilot`, AIPM materializes plugin content into `.github/`.

Current supported mappings:

- agents to `.github/agents/`
- skills to `.github/skills/`
- hooks file to `.github/hooks.json`

### Claude

For `--target claude`, AIPM preserves plugin structure under `.claude/<plugin-name>/`.

Current supported mappings:

- agents under `.claude/<plugin-name>/agents/`
- skills under `.claude/<plugin-name>/skills/`
- hooks under `.claude/<plugin-name>/hooks/`
- plugin manifest under `.claude/<plugin-name>/.claude-plugin/plugin.json`

## Overwrite Behavior

When an install or update would overwrite tracked or unmanaged files, AIPM prompts by default. Use `--force` to bypass the prompt.

## Development

Build the package:

```bash
npm install
npm run build
```

Run tests and typecheck:

```bash
npm test
npm run typecheck
```

## License

MIT
