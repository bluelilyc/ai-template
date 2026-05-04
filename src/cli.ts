#!/usr/bin/env node
import { Command } from 'commander';
import { promises as fs } from 'fs';
import { join, resolve, basename } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { installTemplates, getTargetDirectory, readTemplateManifest } from './installer.js';
import {
  formatMarketplacePluginTable,
  formatMarketplaceRegistryTable,
  formatTemplateTable,
  listConfiguredMarketplacePlugins,
  listInstalledPlugins,
  listRegisteredMarketplaces,
  listTemplateManifests,
} from './listing.js';
import {
  installMarketplacePlugin,
  registerMarketplace,
  syncRegisteredMarketplace,
  syncRegisteredMarketplaces,
  updateMarketplacePlugins,
} from './index.js';
import type { InstallOptions } from './types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const program = new Command();

program
  .name('aipm')
  .description('AIPM (AI Package Manager) installs AI agent templates for GitHub Copilot or Claude')
  .version('1.0.0');

const marketplaceCommand = program.command('marketplace').description('Manage plugin marketplaces');

marketplaceCommand
  .command('add <source>')
  .description('Register and sync a marketplace source')
  .action(async (source) => {
    try {
      const result = await registerMarketplace(process.cwd(), source);
      console.log(`Registered marketplace ${result.record.name}`);
      console.log(`Local cache: ${result.localPath}`);
    } catch (error: any) {
      console.error(`\n✗ Failed to add marketplace: ${error.message}`);
      process.exit(1);
    }
  });

marketplaceCommand
  .command('list')
  .description('List configured marketplaces')
  .action(async () => {
    try {
      const listings = await listRegisteredMarketplaces(process.cwd());
      if (listings.length === 0) {
        console.log('No marketplaces configured');
        return;
      }

      console.log(formatMarketplaceRegistryTable(listings));
    } catch (error: any) {
      console.error(`\n✗ Failed to list marketplaces: ${error.message}`);
      process.exit(1);
    }
  });

marketplaceCommand
  .command('sync [name]')
  .description('Sync configured marketplaces')
  .action(async (name) => {
    try {
      const results = name
        ? [await syncRegisteredMarketplace(process.cwd(), name)]
        : await syncRegisteredMarketplaces(process.cwd());

      if (results.length === 0) {
        console.log('No marketplaces configured');
        return;
      }

      for (const result of results) {
        console.log(`Synced marketplace ${result.record.name}`);
      }
    } catch (error: any) {
      console.error(`\n✗ Failed to sync marketplaces: ${error.message}`);
      process.exit(1);
    }
  });

const pluginCommand = program.command('plugin').description('Manage plugins from configured marketplaces');

pluginCommand
  .command('list')
  .description('List plugins available from configured marketplaces')
  .option('-m, --marketplace <name>', 'Filter to a single marketplace')
  .action(async (options) => {
    try {
      const listings = await listConfiguredMarketplacePlugins(process.cwd());
      const filteredListings = options.marketplace
        ? listings.filter((listing) => listing.marketplace === options.marketplace)
        : listings;

      if (filteredListings.length === 0) {
        console.log('No marketplace plugins found');
        return;
      }

      console.log(formatMarketplacePluginTable(filteredListings));
    } catch (error: any) {
      console.error(`\n✗ Failed to list marketplace plugins: ${error.message}`);
      process.exit(1);
    }
  });

pluginCommand
  .command('installed')
  .description('List installed plugins')
  .action(async () => {
    try {
      const listings = await listInstalledPlugins(process.cwd());
      if (listings.length === 0) {
        console.log('No installed plugins found');
        return;
      }

      console.log(
        formatMarketplacePluginTable(
          listings.map((listing) => ({
            marketplace: listing.marketplace,
            name: listing.name,
            version: listing.version,
            description: listing.description,
          }))
        )
      );
    } catch (error: any) {
      console.error(`\n✗ Failed to list installed plugins: ${error.message}`);
      process.exit(1);
    }
  });

pluginCommand
  .command('install <plugin>')
  .description('Install a plugin from a configured marketplace')
  .option('-m, --marketplace <name>', 'Resolve the plugin from a specific marketplace')
  .option('-t, --target <type>', 'Target system: claude or copilot', 'copilot')
  .option('--force', 'Skip overwrite confirmation prompts')
  .action(async (plugin, options) => {
    try {
      const result = await installMarketplacePlugin(process.cwd(), plugin, {
        marketplaceName: options.marketplace,
        target: options.target as 'claude' | 'copilot',
        force: !!options.force,
      });

      console.log(`Installed ${result.record.name}@${result.record.version} to ${result.record.target}`);
    } catch (error: any) {
      console.error(`\n✗ Failed to install plugin: ${error.message}`);
      process.exit(1);
    }
  });

pluginCommand
  .command('update [plugin]')
  .description('Update one installed plugin or all installed plugins')
  .option('-t, --target <type>', 'Target system: claude or copilot')
  .option('--force', 'Skip overwrite confirmation prompts')
  .action(async (plugin, options) => {
    try {
      const results = await updateMarketplacePlugins(process.cwd(), plugin, {
        target: options.target as 'claude' | 'copilot' | undefined,
        force: !!options.force,
      });

      for (const result of results) {
        if (result.updated) {
          console.log(`Updated ${result.plugin}`);
        } else {
          console.log(`${result.plugin}: ${result.reason}`);
        }
      }
    } catch (error: any) {
      console.error(`\n✗ Failed to update plugins: ${error.message}`);
      process.exit(1);
    }
  });

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
        mcpSource: options.mcp ? resolve(process.cwd(), options.mcp) : undefined,
      };

      for (const templateDir of templateDirs) {
        const manifest = await readTemplateManifest(templateDir);
        const label = manifest?.name ?? basename(templateDir);
        const version = manifest?.version ? `@${manifest.version}` : '';
        console.log(`Installing template pack: ${label}${version}`);
        await installTemplates(templateDir, targetPath, installOptions);
      }

      console.log('\n✓ Installation complete!');
    } catch (error: any) {
      console.error(`\n✗ Installation failed: ${error.message}`);
      process.exit(1);
    }
  });

program
  .command('list')
  .description('List available template packs')
  .option('-s, --source <path>', 'Source directory containing templates (default: ./templates)')
  .action(async (options) => {
    try {
      const templatesRoot = options.source
        ? resolve(process.cwd(), options.source)
        : join(__dirname, '..', 'templates');

      const listings = await listTemplateManifests(templatesRoot);

      if (listings.length === 0) {
        console.log('No template packs found');
        return;
      }

      console.log(formatTemplateTable(listings));
    } catch (error: any) {
      console.error(`\n✗ Failed to list template packs: ${error.message}`);
      process.exit(1);
    }
  });

program.parse();
