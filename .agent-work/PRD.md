# Product Requirements Document: AIPM Repo Scaffolding System

## Executive Summary

AIPM will evolve from a simple AI template installer into a comprehensive repository scaffolding system that can seed and maintain complete, production-ready repositories for building Blue Lily applications. The system will provide:

1. A CLI tool to initialize new repositories with AI infrastructure (agents, prompts, skills, instructions)
2. Standard project structure (plans/, specs/, documentation)
3. An interactive repo-builder agent for customization and flesh-out
4. Optional installation of working UI and services templates
5. Continuous integration with the existing AIPM template system

## Vision

Enable teams to rapidly bootstrap AI-augmented development repositories with battle-tested structures, processes, and tooling. Developers should be able to run a single command and have a fully-configured repository ready for AI-assisted development, complete with context-aware agents that understand the project's architecture, technology choices, and conventions.

## Problem Statement

Currently, teams must manually:
- Set up AI infrastructure (agents, prompts, instructions) per repository
- Define and document development processes and architecture
- Create consistent directory structures and conventions
- Configure AI tooling to understand project-specific context

This leads to:
- Inconsistent AI setups across projects and teams
- Repeated effort for common infrastructure
- Limited knowledge sharing between projects
- Steep learning curve for AI-assisted development

## Target Users

1. **Development Teams** starting new Blue Lily application projects
2. **Engineering Managers** standardizing AI practices across teams
3. **Platform Engineers** maintaining reusable AI infrastructure
4. **Individual Developers** experimenting with AI-augmented workflows

## Core Requirements

### 1. Repository Initialization

**Must Have:**
- CLI command to scaffold a new repository structure
- Installation of core AI infrastructure (.github/ directory with agents, prompts, instructions)
- Creation of standard directories (plans/, specs/)
- Generation of standard documentation files (README.md, CONTRIBUTING.md, AGENTS.md)
- Preservation of existing AIPM functionality (installing template packs)

**Should Have:**
- Interactive prompts for basic project configuration
- Validation of prerequisites (git, node, etc.)
- Support for both local and remote template sources
- Dry-run mode to preview changes

**Could Have:**
- Multiple project archetypes (web app, API service, library, etc.)
- Integration with git initialization and first commit
- Automatic GitHub repository creation

### 2. Skills System

**Must Have:**
- Definition of .skill directory structure and format
- Installation of skills alongside agents/prompts/instructions
- Skills that encode project-specific knowledge:
  - Architecture patterns and decisions
  - Technology stack usage and conventions
  - Development processes and workflows
  - Domain-specific language (DSL) definitions

**Should Have:**
- Skills for common Blue Lily application patterns
- Skill discovery and listing mechanism
- Skill versioning and updates
- Skill composition (skills can reference other skills)

**Could Have:**
- Interactive skill editor
- Skill testing/validation framework
- Community skill marketplace

### 3. Repo-Builder Agent

**Must Have:**
- Agent definition for an interactive repository configuration expert
- Ability to customize project through conversation
- Question prompts for:
  - Project name and description
  - Technology stack preferences
  - Architectural choices
  - Design system selection

**Should Have:**
- Memory of decisions made during setup
- Generation/update of documentation based on choices
- Validation of configuration consistency
- Ability to incrementally add features

**Could Have:**
- Multi-step wizard workflow
- Undo/redo capabilities
- Export configuration for reuse
- Integration with project management tools

### 4. Content and Structure

**Must Have:**
- Standard .github/ content:
  - Core agents (repo-builder, quality-engineer, domain expert)
  - Common prompts (code review, documentation, testing)
  - Base instructions (coding standards, security guidelines)
  - Copilot/Claude configuration
- plans/ directory:
  - Planning document templates
  - Roadmap structure
  - Sprint/iteration templates
- specs/ directory:
  - Technical specification templates
  - Architecture decision record (ADR) templates
  - API specification templates
- Root documentation:
  - README.md template
  - CONTRIBUTING.md with development guidelines
  - AGENTS.md describing available agents

**Should Have:**
- workflows/ directory with CI/CD templates
- .vscode/ directory with recommended extensions and settings
- docs/ directory with documentation structure
- tests/ directory structure and initial test setup

**Could Have:**
- Security policy templates
- Issue and PR templates
- Code of conduct
- License selection

### 5. Optional Components

**Must Have:**
- Flag to install UI directory with working templates
- Flag to install services directory with working templates
- Design system selection mechanism

**Should Have:**
- Multiple UI framework options (React, Vue, Angular, etc.)
- Multiple service architecture options (REST, GraphQL, gRPC)
- Starter components and examples
- Integration tests between UI and services

**Could Have:**
- Database schema and migration setup
- Authentication/authorization scaffolding
- Monitoring and observability setup
- Deployment configuration

### 6. Update and Maintenance

**Must Have:**
- Version tracking of installed templates and structure
- Ability to update AI infrastructure without affecting custom code

**Should Have:**
- Migration guide for breaking changes
- Selective update of components
- Conflict resolution for customized files

**Could Have:**
- Automatic update notifications
- Rollback capabilities
- Change preview before applying updates

## Non-Functional Requirements

### Performance
- Repository initialization should complete in < 30 seconds for base install
- Template installation should handle 100+ files efficiently
- No significant increase to repository size (< 5MB for base install)

### Reliability
- Atomic operations (complete success or rollback)
- Clear error messages with recovery suggestions
- Validation of templates before installation
- Backup of existing files before overwrite

### Security
- No secrets in templates or scaffolded code
- Security best practices in all generated code
- Validation of template sources
- Safe handling of user input

### Usability
- Clear, actionable CLI output
- Comprehensive help documentation
- Consistent naming and conventions
- Gradual learning curve

### Maintainability
- Modular architecture for easy extension
- Comprehensive test coverage
- Clear separation of concerns
- Documentation for contributors

## Technical Constraints

- Must work with existing AIPM codebase (TypeScript, ESM, Vite)
- Must support both GitHub Copilot and Claude Code
- Must work on Linux, macOS, and Windows
- Must work with Node.js 18+
- Should minimize external dependencies

## Success Metrics

1. **Adoption**: Number of repositories initialized with AIPM
2. **Time to Productivity**: Time from running init to first AI-assisted commit
3. **Consistency**: Percentage of teams using standard structure
4. **Satisfaction**: Developer feedback on ease of use and utility
5. **Maintenance**: Time saved vs. manual setup

## Initiatives (MVP Roadmap)

### Initiative 1: Core Scaffolding Engine (MVP1)

**Goal**: Extend AIPM to scaffold basic repository structure with minimal AI infrastructure.

**Scope**:
- New `aipm init` command that:
  - Creates .github/, plans/, specs/ directories
  - Copies base agents, prompts, instructions from templates
  - Generates README.md, CONTRIBUTING.md, AGENTS.md templates
  - Installs existing template packs (quality-engineer, csharp-engineer)
- Basic project metadata collection (name, description)
- File-based templates for documentation generation

**Success Criteria**:
- Can run `aipm init my-project` and get a working repository structure
- Generated repository has functional AI agents in .github/
- Documentation files contain project-specific information
- All existing AIPM functionality remains intact

**Deliverables**:
- `init` command implementation
- Base repository templates
- Documentation template system
- Integration tests

**Effort Estimate**: 2-3 weeks

---

### Initiative 2: Skills System Foundation (MVP2)

**Goal**: Implement skills as a first-class template type alongside agents/prompts/instructions.

**Scope**:
- Define .skill directory structure and schema
- Extend template installer to handle .skill directories
- Create 3-5 foundational skills:
  - blue-lily-architecture.skill (architecture patterns)
  - typescript-conventions.skill (coding standards)
  - testing-strategy.skill (test approaches)
  - git-workflow.skill (branching, commits, PRs)
  - planning-process.skill (how to plan work)
- Update `aipm list` to show available skills
- Install skills to .github/skills/ directory

**Success Criteria**:
- Skills can be packaged in template packs
- `aipm install` correctly installs .skill directories
- Skills are discoverable by AI agents
- Skills contain useful, actionable project knowledge

**Deliverables**:
- Skill schema and structure documentation
- Skill installation in installer.ts
- 5 example skills
- Skill listing functionality
- Tests for skill installation

**Effort Estimate**: 2-3 weeks

---

### Initiative 3: Enhanced Scaffolding & Plans/Specs (MVP3)

**Goal**: Add comprehensive plans/ and specs/ directory scaffolding with templates.

**Scope**:
- plans/ directory structure:
  - planning-template.md (standardized planning format)
  - roadmap.md (project roadmap template)
  - sprint-template.md (iteration planning)
  - retro-template.md (retrospective format)
- specs/ directory structure:
  - adr-template.md (architecture decision records)
  - api-spec-template.md (API specifications)
  - feature-spec-template.md (feature specifications)
  - technical-design-template.md (design documents)
- Template variable substitution system ({{projectName}}, {{description}}, etc.)
- Enhanced init command with more project questions

**Success Criteria**:
- Generated plans/ directory has usable planning templates
- Generated specs/ directory has technical documentation templates
- Templates include guidance and examples
- Variable substitution works correctly

**Deliverables**:
- Planning document templates
- Specification document templates
- Template variable substitution engine
- Updated init command
- Documentation for template usage

**Effort Estimate**: 2-3 weeks

---

### Initiative 4: Repo-Builder Agent (MVP4)

**Goal**: Create an interactive AI agent that helps flesh out repository configuration post-initialization.

**Scope**:
- repo-builder.agent.md definition with:
  - Expert knowledge of repository structure
  - Question-asking capabilities
  - File generation/update abilities
  - Context awareness of project decisions
- repo-builder.instructions.md with:
  - Workflow for gathering requirements
  - Decision tree for technology choices
  - Templates for common configurations
- repo-builder.prompt.md for common tasks:
  - "Help me configure my project"
  - "Add a new feature area"
  - "Update architecture decisions"
- Integration with skills system (builder uses skills)
- Conversation memory/context tracking

**Success Criteria**:
- User can interact with repo-builder agent in VS Code
- Agent asks relevant questions about project
- Agent generates/updates files based on answers
- Agent provides guidance on next steps
- Decisions are documented automatically

**Deliverables**:
- repo-builder agent definition
- Conversation workflow templates
- Integration with existing agents
- Example conversation flows
- User documentation

**Effort Estimate**: 3-4 weeks

---

### Initiative 5: Design System Integration (MVP5)

**Goal**: Enable selection and installation of design systems during initialization.

**Scope**:
- Design system template structure
- Initial design system options:
  - blue-lily-default (standard Blue Lily design)
  - material-design (Material UI adaptation)
  - minimal (minimal styling baseline)
- Design system components:
  - Theme configuration
  - Base components
  - Design tokens
  - Usage documentation
- `aipm init --design-system <name>` flag
- Design system listing and preview

**Success Criteria**:
- Can select design system during init
- Design system files installed to appropriate location
- Theme tokens available for use
- Documentation explains design system usage

**Deliverables**:
- Design system template structure
- 3 design system options
- Init integration
- Design system documentation
- Example components

**Effort Estimate**: 3-4 weeks

---

### Initiative 6: UI and Services Scaffolding (MVP6)

**Goal**: Optionally install working UI and services directory structures with starter code.

**Scope**:
- ui/ directory template:
  - React/TypeScript setup (default)
  - Component structure
  - Routing setup
  - State management
  - Example pages
  - Test setup
- services/ directory template:
  - Node.js/TypeScript API service (default)
  - REST endpoint structure
  - Database integration layer
  - Authentication middleware
  - Test setup
- `aipm init --with-ui --with-services` flags
- Alternative framework support:
  - `--ui-framework react|vue|angular`
  - `--services-framework express|fastify|nestjs`
- Integration between UI and services (API client, types)

**Success Criteria**:
- Generated UI compiles and runs
- Generated services start and respond to requests
- UI can call services APIs
- Tests pass for both UI and services
- Developer can immediately start adding features

**Deliverables**:
- UI template for React/TypeScript
- Services template for Express/TypeScript
- Build and dev scripts
- Integration layer
- Documentation
- Tests

**Effort Estimate**: 4-6 weeks

---

### Initiative 7: Update and Versioning System (MVP7)

**Goal**: Enable safe updates to AI infrastructure and templates without breaking customizations.

**Scope**:
- Version tracking in .aipm-version.json file
- `aipm update` command:
  - Check for template updates
  - Show what would change
  - Apply updates selectively
  - Preserve customizations
- Update strategies:
  - Safe updates (non-conflicting files)
  - Interactive merge (conflicting files)
  - Manual review (significant changes)
- Migration system for breaking changes
- Rollback capability

**Success Criteria**:
- Can update templates without losing customizations
- Clear diff of what will change
- Safe handling of conflicts
- Rollback works if update fails
- Version compatibility checking

**Deliverables**:
- Version tracking system
- Update command implementation
- Merge strategies
- Migration framework
- Rollback functionality
- Update documentation

**Effort Estimate**: 3-4 weeks

---

### Initiative 8: Template Marketplace and Sharing (MVP8)

**Goal**: Enable community sharing and discovery of templates, skills, and scaffolds.

**Scope**:
- Template registry/marketplace concept
- `aipm search <keyword>` command
- `aipm publish` command for template authors
- Template quality criteria and validation
- Remote template installation:
  - `aipm init --template github:owner/repo`
  - `aipm init --template npm:package-name`
- Template rating and reviews
- Featured/verified templates

**Success Criteria**:
- Can discover community templates
- Can install templates from multiple sources
- Publishing workflow is straightforward
- Quality templates are discoverable
- Security validation for external templates

**Deliverables**:
- Template registry design
- Search and discovery functionality
- Publishing workflow
- Remote template resolution
- Security validation
- Marketplace documentation

**Effort Estimate**: 4-6 weeks

---

## Open Questions

1. **Bloom Repository**: Need detailed information about the Bloom repository structure to ensure accurate replication
2. **Blue Lily Specifics**: What are the defining characteristics of a Blue Lily application?
3. **DLS Definition**: What does DLS stand for in the context of skills?
4. **Technology Stack**: What is the preferred/default technology stack for UI and services?
5. **Agent Interaction Model**: How should the repo-builder agent interact (CLI vs. chat)?
6. **Hosting**: Where should the template marketplace be hosted if implemented?
7. **Licensing**: How should community-contributed templates be licensed?
8. **Versioning Strategy**: Semantic versioning for templates? How to handle breaking changes?

## Risks and Mitigation

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Template drift from best practices | High | Medium | Regular review cycles, community feedback |
| Breaking changes in AI platforms | High | Medium | Abstract platform-specific details, maintain compatibility layer |
| Over-engineering for edge cases | Medium | High | Start simple, iterate based on real usage |
| Poor skill/template discoverability | Medium | Medium | Invest in search and documentation |
| Security vulnerabilities in templates | High | Low | Security review process, automated scanning |
| Customization conflicts with updates | Medium | High | Robust merge strategies, clear guidance |

## Dependencies

- Existing AIPM codebase and architecture
- Access to Bloom repository as reference implementation
- TypeScript/ESM ecosystem
- GitHub Copilot and Claude Code platforms
- Community adoption and feedback

## Success Criteria for Overall Project

1. **Developer Onboarding**: Reduce time-to-first-commit from days to hours
2. **Consistency**: 80%+ of new Blue Lily projects use AIPM scaffolding
3. **Quality**: Generated code meets all quality and security standards
4. **Adoption**: 50+ teams using AIPM for repository initialization within 6 months
5. **Community**: 10+ community-contributed templates/skills within 1 year
6. **Satisfaction**: 4.5+/5 developer satisfaction rating

## Appendices

### A. Glossary

- **AIPM**: AI Package Manager
- **Blue Lily Application**: [Needs definition - type of application with specific architecture]
- **Skill**: Packaged knowledge about project-specific patterns, processes, or technologies
- **Template Pack**: Collection of agents, prompts, instructions, and skills
- **Scaffolding**: Generating initial project structure and boilerplate code
- **Repo-Builder Agent**: Interactive AI agent that helps configure and customize repositories

### B. References

- Current AIPM README and documentation
- Bloom repository (pending access for detailed review)
- GitHub Copilot documentation
- Claude Code documentation

### C. Future Considerations

Beyond the 8 initiatives outlined above:
- Multi-repository orchestration (monorepo support)
- Cloud deployment automation
- Continuous integration with team practices
- Analytics and usage tracking
- Enterprise features (private registries, compliance)
- IDE integrations beyond VS Code
- AI pair programming workflows
- Automated refactoring and migration tools

---

## Notes for Product Team

This PRD is designed to be implemented incrementally through 8 MVPs, each building on the previous one. The sequence is designed to:

1. Start with core value (scaffolding) - **MVP1**
2. Add differentiation (skills) - **MVP2**
3. Enhance structure (plans/specs) - **MVP3**
4. Enable customization (repo-builder) - **MVP4**
5. Add design support - **MVP5**
6. Complete full-stack setup - **MVP6**
7. Enable maintenance - **MVP7**
8. Build community - **MVP8**

Each initiative can be implemented as a 2-6 week sprint, allowing for feedback and adjustment between MVPs.

**Critical Path**: MVP1 → MVP2 → MVP4 → MVP6 (core functionality)
**Enhancement Path**: MVP3 → MVP5 → MVP7 → MVP8 (additional features)

Review and adjust this PRD based on feedback from stakeholders and clarification of open questions.
