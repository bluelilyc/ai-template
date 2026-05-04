# Contributing to AIPM

Thank you for contributing to AIPM. The project is now centered on marketplace-driven VS Code agent plugins, not bundled template packs, so contributions should follow that model.

## Getting Started

1. Fork the repository.
2. Clone your fork:

   ```bash
   git clone https://github.com/your-username/aipm.git
   cd aipm
   ```

3. Install dependencies:

   ```bash
   npm install
   ```

4. Create a branch for your work.
5. Make your changes.
6. Run the validation commands before opening a pull request.

## Development Workflow

### Build

```bash
npm run build
```

### Typecheck

```bash
npm run typecheck
```

### Test

```bash
npm test
```

### Local CLI Testing

After building, test the CLI against a throwaway repository:

```bash
npm link
mkdir test-repo
cd test-repo
git init
aipm marketplace list
node ../dist/cli.js plugin list
```

## What to Contribute

Useful contribution areas include:

- marketplace source parsing and sync behavior
- marketplace and plugin manifest validation
- plugin listing, install, update, and remove flows
- `.github` and `.claude` install planning and file ownership tracking
- CLI usability and output formatting
- tests and fixtures for real marketplace shapes
- documentation for the marketplace-based workflow

## Marketplace and Plugin Expectations

When contributing marketplace-related behavior, align with the repository's current model:

- marketplaces are Git repositories with `.github/plugin/marketplace.json`
- plugin roots resolve from `metadata.pluginRoot` plus the marketplace entry `source`
- plugin manifests are discovered from the recognized VS Code-compatible manifest locations, including `.claude-plugin/plugin.json`
- Copilot installs materialize into `.github`
- Claude installs materialize into `.claude/<plugin-name>`

If you add or adjust fixtures, prefer fixture-based marketplace repositories under `tests/fixtures/marketplaces/` instead of reintroducing bundled sample packs.

## Code Style

- Use TypeScript for all source code.
- Keep ESM imports explicit with `.js` extensions where required by the project.
- Follow the existing code style and keep changes focused.
- Add or update tests with behavioral changes.
- Prefer small, single-purpose functions and explicit types over implicit behavior.

## Pull Requests

Before submitting a pull request:

1. Ensure your branch is up to date with the target branch.
2. Run `npm test` and `npm run typecheck`.
3. Update documentation when behavior or CLI commands change.
4. Include a clear summary of the problem, the fix, and any compatibility implications.

## Questions

If you have questions or need help, open an issue on GitHub.
