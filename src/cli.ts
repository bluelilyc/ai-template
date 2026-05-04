#!/usr/bin/env node
import { Command } from 'commander';
import {
  formatMarketplacePluginTable,
  formatMarketplaceRegistryTable,
  listConfiguredMarketplacePlugins,
  listInstalledPlugins,
  listRegisteredMarketplaces,
} from './listing.js';
import {
  installMarketplacePlugin,
  removeMarketplacePlugin,
  registerMarketplace,
  syncRegisteredMarketplace,
  syncRegisteredMarketplaces,
  updateMarketplacePlugins,
} from './index.js';

const program = new Command();

program
  .name('aipm')
  .description('AIPM (AI Package Manager) manages VS Code agent plugin marketplaces and installs plugins for GitHub Copilot or Claude')
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
  .command('remove <plugin>')
  .description('Remove an installed plugin and delete its tracked files')
  .option('-t, --target <type>', 'Target system: claude or copilot')
  .action(async (plugin, options) => {
    try {
      const results = await removeMarketplacePlugin(process.cwd(), plugin, {
        target: options.target as 'claude' | 'copilot' | undefined,
      });

      for (const result of results) {
        console.log(`Removed ${result.name} from ${result.target}`);
      }
    } catch (error: any) {
      console.error(`\n✗ Failed to remove plugin: ${error.message}`);
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

program.parse();
