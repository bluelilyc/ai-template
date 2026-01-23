# Contributing to AIPM (AI Package Manager)

Thank you for your interest in contributing to AIPM (AI Package Manager)! This document provides guidelines for contributing to the project.

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/your-username/aipm.git`
3. Install dependencies: `npm install`
4. Make your changes
5. Build the project: `npm run build`
6. Test your changes locally

## Development

### Building

```bash
npm run build
```

### Type Checking

```bash
npm run typecheck
```

### Testing Locally

After building, you can test the CLI locally:

```bash
# Link the package globally
npm link

# Test the installation
mkdir test-repo && cd test-repo
git init
aipm install

# Or test directly without linking
node dist/cli.js install --help
```

## Adding New Templates

To add new templates:

1. Create your template file in the appropriate directory:
   - `templates/agents/` for `.agent.md` files
   - `templates/prompts/` for `.prompt.md` files
   - `templates/instructions/` for `.instructions.md` files
   - `templates/skills/` for `.skill` directories

2. Follow the naming conventions:
   - Agent files: `name.agent.md`
   - Prompt files: `name.prompt.md`
   - Instruction files: `name.instructions.md`
   - Skill directories: `name.skill/`

3. Include clear documentation in your template

## Code Style

- Use TypeScript for all source code
- Follow the existing code style
- Add type annotations where appropriate
- Keep functions small and focused
- Write clear, descriptive variable names

## Submitting Changes

1. Create a new branch for your changes
2. Make your changes with clear, descriptive commit messages
3. Test your changes thoroughly
4. Submit a pull request

## Questions?

If you have questions or need help, please open an issue on GitHub.
