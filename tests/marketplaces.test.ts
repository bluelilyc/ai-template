import { describe, expect, it } from 'vitest';
import { join } from 'path';
import {
  compareMarketplaceEntryToPluginManifest,
  normalizePluginManifest,
  readMarketplaceManifest,
  readPluginManifest,
  resolveMarketplacePluginRoot,
} from '../src/marketplaces.js';

const fixtureRoot = join(process.cwd(), 'tests', 'fixtures', 'marketplaces', 'bluelily');

describe('readMarketplaceManifest', () => {
  it('parses the Blue Lily marketplace shape', async () => {
    const marketplace = await readMarketplaceManifest(fixtureRoot);

    expect(marketplace.name).toBe('bluelilyc-tools');
    expect(marketplace.metadata.pluginRoot).toBe('./marketplace/copilot/plugins');
    expect(marketplace.plugins.map((plugin) => plugin.name)).toEqual([
      'core',
      'product-management',
    ]);
  });
});

describe('resolveMarketplacePluginRoot', () => {
  it('resolves plugin roots from pluginRoot and source', async () => {
    const marketplace = await readMarketplaceManifest(fixtureRoot);
    const corePlugin = marketplace.plugins[0];

    expect(resolveMarketplacePluginRoot(fixtureRoot, marketplace, corePlugin)).toBe(
      join(fixtureRoot, 'marketplace', 'copilot', 'plugins', 'core')
    );
  });
});

describe('readPluginManifest', () => {
  it('accepts a Claude-format plugin manifest location for VS Code compatibility', async () => {
    const marketplace = await readMarketplaceManifest(fixtureRoot);
    const corePluginRoot = resolveMarketplacePluginRoot(fixtureRoot, marketplace, marketplace.plugins[0]);

    const result = await readPluginManifest(corePluginRoot);

    expect(result.manifestPath.endsWith(join('.claude-plugin', 'plugin.json'))).toBe(true);
    expect(result.manifest.name).toBe('core');
    expect(result.normalizedManifest.agents).toEqual(['./agents/']);
    expect(result.normalizedManifest.skills).toEqual(['./skills/']);
    expect(result.normalizedManifest.scripts).toEqual(['./scripts/']);
    expect(result.normalizedManifest.hooksPath).toBe('./hooks/hooks.json');
  });

  it('normalizes string and array path fields', () => {
    const normalizedManifest = normalizePluginManifest({
      name: 'test-plugin',
      agents: ['./agents/', './more-agents/'],
      skills: './skills/',
      scripts: './scripts/',
      mcpServers: { mcpServers: {} },
    });

    expect(normalizedManifest.agents).toEqual(['./agents/', './more-agents/']);
    expect(normalizedManifest.skills).toEqual(['./skills/']);
    expect(normalizedManifest.scripts).toEqual(['./scripts/']);
    expect(normalizedManifest.mcpServersInline).toEqual({ mcpServers: {} });
  });
});

describe('compareMarketplaceEntryToPluginManifest', () => {
  it('detects marketplace and manifest version mismatches', async () => {
    const marketplace = await readMarketplaceManifest(fixtureRoot);
    const corePluginRoot = resolveMarketplacePluginRoot(fixtureRoot, marketplace, marketplace.plugins[0]);
    const pluginManifest = await readPluginManifest(corePluginRoot);

    const comparison = compareMarketplaceEntryToPluginManifest(
      marketplace.plugins[0],
      pluginManifest.manifest
    );

    expect(comparison.nameMatches).toBe(true);
    expect(comparison.versionMatches).toBe(false);
    expect(comparison.issues).toContain(
      'Marketplace plugin version "0.5.0" does not match manifest version "0.6.0"'
    );
  });

  it('fails identity comparison on plugin name mismatch', async () => {
    const marketplace = await readMarketplaceManifest(fixtureRoot);
    const corePluginRoot = resolveMarketplacePluginRoot(fixtureRoot, marketplace, marketplace.plugins[0]);
    const pluginManifest = await readPluginManifest(corePluginRoot);

    const comparison = compareMarketplaceEntryToPluginManifest(
      { ...marketplace.plugins[0], name: 'wrong-name' },
      pluginManifest.manifest
    );

    expect(comparison.nameMatches).toBe(false);
    expect(comparison.issues[0]).toContain('wrong-name');
  });
});