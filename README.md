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

Install templates for GitHub Copilot (default):

```bash
aipm install
```

Install templates for Claude:

```bash
aipm install --target claude
```

### Custom Installation Path

Install to a custom directory:

```bash
aipm install --path /path/to/custom/directory
```

### Using Custom Templates

Install from a custom template directory:

```bash
aipm install --source ./my-templates
```

### MCP Configuration

Merge MCP server configurations:

```bash
aipm install --mcp ./mcp.json
```

## Template Structure

The package includes the following types of templates:

### Agents (`.agent.md`)

Agent files define AI agents with specific roles and capabilities:

- `code-review.agent.md` - Code review specialist
- `docs-writer.agent.md` - Documentation writer

### Prompts (`.prompt.md`)

Reusable prompt templates for common tasks:

- `bug-fix.prompt.md` - Bug fix workflow
- `feature.prompt.md` - Feature implementation workflow

### Instructions (`.instructions.md`)

General guidelines and best practices:

- `code-quality.instructions.md` - Code quality standards
- `git-workflow.instructions.md` - Git workflow practices

### Skills (`.skill` directories)

Complete skill packages with examples and documentation:

- `testing.skill/` - Testing capabilities with examples

## Directory Structure

### GitHub Copilot

Templates are installed to `.github/` (no `copilot` subdirectory):

```
.github/
├── agents/
│   ├── code-review.agent.md
│   └── docs-writer.agent.md
├── prompts/
│   ├── bug-fix.prompt.md
│   └── feature.prompt.md
├── instructions/
│   ├── code-quality.instructions.md
│   └── git-workflow.instructions.md
└── skills/
  └── testing.skill/
```

### Claude

Templates are installed to `.github/claude/`:

```
.github/claude/
├── agents/
│   ├── code-review.agent.md
│   └── docs-writer.agent.md
├── prompts/
│   ├── bug-fix.prompt.md
│   └── feature.prompt.md
├── instructions/
│   ├── code-quality.instructions.md
│   └── git-workflow.instructions.md
└── skills/
    └── testing.skill/
```

## Creating Custom Templates

You can create your own templates by following these naming conventions:

- Agent files: `*.agent.md`
- Prompt files: `*.prompt.md`
- Instruction files: `*.instructions.md`
- Skill directories: `*.skill/`

Organize them in a directory structure and use the `--source` option to install them.

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
