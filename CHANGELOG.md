# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-01-22

### Added
- Initial release of ai-template CLI tool
- Command-line interface for installing AI templates
- Support for GitHub Copilot directory structure (`.github/copilot`)
- Support for Claude directory structure (`.github/claude`)
- Installation of `.agent.md` files for AI agents
- Installation of `.prompt.md` files for reusable prompts
- Installation of `.instructions.md` files for guidelines
- Installation of `.skill` directories for complete skill packages
- MCP (Model Context Protocol) configuration merging
- Custom installation path option
- Custom template source directory option
- Example templates included:
  - Code review agent
  - Documentation writer agent
  - Bug fix prompt
  - Feature implementation prompt
  - Code quality instructions
  - Git workflow instructions
  - Testing skill package
- Comprehensive documentation and usage examples
- TypeScript implementation with full type safety
- Vite bundler for optimized builds
- ES module support

### Technical Details
- Built with Node.js and TypeScript
- Bundled with Vite for optimal performance
- Uses Commander.js for CLI argument parsing
- Supports both Node.js 18+ environments
- Published as ES module
