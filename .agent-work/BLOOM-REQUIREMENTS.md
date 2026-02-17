# Bloom Repository Information Needed

## Status
✅ **Repository Located**: `https://github.com/bluelilyc/bloom`  
❌ **Access Denied**: Repository is private - cannot read contents via API  
📝 **Description**: "The backend application for managing Blue Lily Collectables"  
💻 **Language**: C#  

## Information Required to Complete PRD

To accurately update the PRD with concrete examples from the Bloom repository, I need the following information:

### 1. `.github/` Directory Structure

**What I need:**
```
.github/
├── agents/           # List of agent files and 1-2 sample agents
├── prompts/          # List of prompt files and 1-2 sample prompts
├── instructions/     # List of instruction files and 1-2 samples
├── skills/           # If exists - structure and 1-2 sample skills
├── copilot-instructions.md  # If exists
└── [other files?]
```

**Specific Questions:**
- What agent files exist? (e.g., `repo-builder.agent.md`, `domain-expert.agent.md`)
- What naming conventions do you use?
- How are skills currently structured (if they exist)?
- Are there any MCP configurations?

### 2. `plans/` Directory Structure

**What I need:**
- List of files in the plans/ directory
- 1-2 sample planning templates or documents
- Understanding of the planning format/structure

**Specific Questions:**
- What planning methodology do you use? (Agile, Shape Up, custom?)
- What file format? (Markdown, PDF, other?)
- What sections/structure do planning documents have?
- Are there templates for different types of plans?

### 3. `specs/` Directory Structure

**What I need:**
- List of files in the specs/ directory
- 1-2 sample specification templates
- Understanding of spec categories

**Specific Questions:**
- What types of specs do you create? (Technical, API, Feature, Architecture?)
- What template structure do specs follow?
- Are there ADR (Architecture Decision Records)?
- How detailed are specs typically?

### 4. `AGENTS.md` File

**What I need:**
- Complete content of the AGENTS.md file (or a representative sample)

**Specific Questions:**
- What information does AGENTS.md contain?
- How are agents described/documented?
- Does it include usage instructions?
- Does it explain the agent interaction model?

### 5. Root Documentation Files

**What I need:**
- Structure/outline of README.md (what sections does it have?)
- Structure/outline of CONTRIBUTING.md (what's included?)
- Any other root-level documentation files

**Specific Questions:**
- What information is in README.md? (Project overview, setup, architecture?)
- What guidelines are in CONTRIBUTING.md? (Code style, PR process, testing?)
- Are there other important documentation files?

### 6. Blue Lily Application Characteristics

**What I need:**
- Definition of what makes an application a "Blue Lily application"
- Technology stack (languages, frameworks, libraries)
- Architecture patterns (monolith, microservices, layered, etc.)
- Common components/structure

**Specific Questions:**
- Is Blue Lily a specific framework or architecture pattern?
- What technologies are standard? (C# based on bloom repo?)
- What are the typical application tiers? (UI, API, Database, etc.)
- Are there specific design patterns or conventions?

### 7. Skills System (DLS and Others)

**What I need:**
- Definition of DLS (Domain-Specific Language? Development Lifecycle System? Other?)
- Examples of what skills should encode
- How skills differ from instructions/prompts/agents

**Specific Questions:**
- What does DLS stand for in your context?
- What specific knowledge should skills contain?
- How should skills be structured?
- Do you have existing skill examples?

### 8. UI and Services Structure (if exists in Bloom)

**What I need:**
- If Bloom has `ui/` directory - what's the structure?
- If Bloom has `services/` directory - what's the structure?
- What frameworks/tools are used?

**Specific Questions:**
- Does Bloom have a frontend component?
- What's the backend service architecture?
- What testing frameworks are used?
- What build/dev tools are configured?

## How to Provide This Information

You can provide this information in any of these ways:

### Option 1: Grant Repository Access
If possible, grant read access to the bloom repository so I can explore it directly using GitHub API tools.

### Option 2: Share Specific Files
Copy/paste or share the contents of key files:
- Sample agents from `.github/agents/`
- Sample planning doc from `plans/`
- Sample spec from `specs/`
- The `AGENTS.md` file
- README.md and CONTRIBUTING.md outlines

### Option 3: Describe Structure
Provide written descriptions of:
- Directory structures and file lists
- Template formats and sections
- Conventions and patterns used

### Option 4: Make Repository Temporarily Public
If feasible, temporarily make the repository public while I extract the needed information, then revert to private.

## Why This Information Is Important

With concrete examples from Bloom, I can:
1. ✅ Update the PRD with accurate, real-world requirements
2. ✅ Design templates that match your actual needs
3. ✅ Create scaffolding that produces Bloom-like repositories
4. ✅ Ensure the repo-builder agent understands your patterns
5. ✅ Build skills that encode your actual processes and architecture

Without this information, the PRD remains generic and may not meet your specific needs when implemented.

## Next Steps

Once I receive this information, I will:
1. Update the PRD with concrete examples and requirements
2. Refine the initiative definitions based on actual Bloom structure
3. Create accurate templates for the scaffolding system
4. Proceed with implementation planning for MVP1
