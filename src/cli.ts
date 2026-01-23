#!/usr/bin/env node
import { Command } from 'commander';
import { promises as fs } from 'fs';
import { join, resolve, basename } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { installTemplates, getTargetDirectory } from './installer.js';
import type { InstallOptions } from './types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const program = new Command();

program
  .name('aipm')
  .description('AIPM (AI Package Manager) installs AI agent templates for GitHub Copilot or Claude')
  .version('1.0.0');

program
  .command('install')
  .description('Install templates into your repository')
  .option('-t, --target <type>', 'Target system: claude or copilot', 'copilot')
  .option('-p, --path <path>', 'Custom installation path (overrides default)')
  .option('-s, --source <path>', 'Source directory containing templates (default: ./templates)')
  .option('--template <name>', 'Template name under ./templates (default: all)')
  .option('--mcp <file>', 'Path to mcp.json file to merge')
  .action(async (options) => {
    try {
      // Validate target
      const target = options.target as 'claude' | 'copilot';
      if (target !== 'claude' && target !== 'copilot') {
        console.error('Error: Target must be either "claude" or "copilot"');
        process.exit(1);
      }

      // Determine source directory
      const templatesRoot = options.source
        ? resolve(process.cwd(), options.source)
        : join(__dirname, '..', 'templates');

      const templateDirs = options.template
        ? [join(templatesRoot, options.template)]
        : (await fs.readdir(templatesRoot, { withFileTypes: true }))
            .filter((entry) => entry.isDirectory())
            .map((entry) => join(templatesRoot, entry.name));

      if (templateDirs.length === 0) {
        console.log('No template packs found to install');
        return;
      }

      // Determine target directory
      const targetPath = options.path 
        ? resolve(process.cwd(), options.path)
        : resolve(process.cwd(), getTargetDirectory(target));

      console.log(`Installing templates to ${targetPath}...`);
      console.log(`Target system: ${target}`);

      const installOptions: InstallOptions = {
        target,
        targetPath,
        mergeMcp: !!options.mcp,
        mcpSource: options.mcp ? resolve(process.cwd(), options.mcp) : undefined
      };

      for (const templateDir of templateDirs) {
        console.log(`Installing template pack: ${basename(templateDir)}`);
        await installTemplates(templateDir, targetPath, installOptions);
      }
      
      console.log('\n✓ Installation complete!');
    } catch (error: any) {
      console.error(`\n✗ Installation failed: ${error.message}`);
      process.exit(1);
    }
  });

program.parse();
