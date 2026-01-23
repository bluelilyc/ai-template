# AIPM (AI Package Manager)

AIPM (AI Package Manager) is a CLI tool to install AI agent templates, instructions, prompts, and skills for GitHub Copilot or Claude Code.

## Installation

```bash
npm install -g aipm
```

Or use directly with npx:

```bash
npx aipm install
```

## Usage

### Basic Installation

Install all template packs for GitHub Copilot (default):

```bash
aipm install
```

Install all template packs for Claude:

```bash
aipm install --target claude
```

### Custom Installation Path

Install to a custom directory:

```bash
aipm install --path /path/to/custom/directory
```

### Using Custom Templates

Install from a custom template directory (installs all packs under it):

```bash
aipm install --source ./my-templates
```

### Choosing a Template Pack

Templates are stored under `templates/<template-name>/`. By default, all packs are installed. Install a specific pack with:

```bash
aipm install --template quality-engineer
```

### MCP Configuration

Merge MCP server configurations:

```bash
aipm install --mcp ./mcp.json
```

## Template Structure

The built-in templates live under `templates/<template-name>/`, for example:

```
templates/
  quality-engineer/
    agents/
    prompts/
    instructions/
```

The package includes the following types of templates:

### Agents (`.agent.md`)

Agent files define AI agents with specific roles and capabilities:

- `quality-engineer.agent.md` - Quality engineering specialist

### Prompts (`.prompt.md`)

Reusable prompt templates for common tasks:

- `quality-review.prompt.md` - Quality review checklist

### Instructions (`.instructions.md`)

General guidelines and best practices:

- `quality-engineer.instructions.md` - Quality engineering standards

### Skills (`.skill` directories)

Skill packages can be added under `skills/` as needed.

## Directory Structure

### GitHub Copilot

Templates are installed to `.github/` (no `copilot` subdirectory):

```
.github/
├── agents/
│   └── quality-engineer.agent.md
├── prompts/
│   └── quality-review.prompt.md
├── instructions/
│   └── quality-engineer.instructions.md
└── skills/
```

### Claude

Templates are installed to `.github/claude/`:

```
.github/claude/
├── agents/
│   └── quality-engineer.agent.md
├── prompts/
│   └── quality-review.prompt.md
├── instructions/
│   └── quality-engineer.instructions.md
└── skills/
```

## Creating Custom Templates

You can create your own templates by following these naming conventions:

- Agent files: `*.agent.md`
- Prompt files: `*.prompt.md`
- Instruction files: `*.instructions.md`
- Skill directories: `*.skill/`

Organize them under `templates/<template-name>/` or in any standalone directory and use the `--template` or `--source` option to install them.

## MCP Configuration

The tool can merge MCP (Model Context Protocol) server configurations. Create an `mcp.json` file with your server configurations:

```json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/path/to/files"]
    },
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "your-token"
      }
    }
  }
}
```

Then merge it into your target directory:

```bash
aipm install --mcp ./mcp.json
```

## Development

### Building

```bash
npm install
npm run build
```

### Local Testing

```bash
npm link
aipm install
```

## License

MIT
