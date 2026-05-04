import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { access, mkdtemp, rm } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import {
  formatMarketplacePluginTable,
  formatMarketplaceRegistryTable,
  listConfiguredMarketplacePlugins,
  listMarketplacePlugins,
  listRegisteredMarketplaces,
} from '../src/listing.js';
import { getMarketplaceCacheRoot, registerMarketplace } from '../src/marketplaces.js';
import { pathToFileURL } from 'url';

const marketplaceFixtureRoot = join(process.cwd(), 'tests', 'fixtures', 'marketplaces', 'bluelily');

let workDir: string;

beforeEach(async () => {
  workDir = await mkdtemp(join(tmpdir(), 'aipm-list-'));
});

afterEach(async () => {
  await rm(workDir, { recursive: true, force: true });
});

async function exists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

describe('listMarketplacePlugins', () => {
  it('returns manifest versions and mismatch notes from the marketplace fixture', async () => {
    const listings = await listMarketplacePlugins(marketplaceFixtureRoot);

    expect(listings).toEqual([
      {
        marketplace: 'bluelilyc-tools',
        name: 'core',
        version: '0.6.0',
        description:
          'Core workflow, review-evidence, transcript-hook, and shared repository-guidance plugin',
        notes: 'Marketplace plugin version "0.5.0" does not match manifest version "0.6.0"',
        manifestVersion: '0.6.0',
        marketplaceVersion: '0.5.0',
      },
      {
        marketplace: 'bluelilyc-tools',
        name: 'product-management',
        version: '0.3.0',
        description:
          'Product-management planning plugin for Feature, Story, Task, and process-improvement work',
        notes: 'Marketplace plugin version "0.2.0" does not match manifest version "0.3.0"',
        manifestVersion: '0.3.0',
        marketplaceVersion: '0.2.0',
      },
    ]);
  });
});

describe('listRegisteredMarketplaces', () => {
  it('lists configured marketplaces from settings', async () => {
    await registerMarketplace(workDir, pathToFileURL(marketplaceFixtureRoot).toString());

    const listings = await listRegisteredMarketplaces(workDir);

    expect(listings).toHaveLength(1);
    expect(listings[0].name).toBe('bluelilyc-tools');
    expect(listings[0].localPath).toBe('.aipm/cache/marketplaces/bluelily');
  });

  it('resyncs configured marketplaces when the cache is missing', async () => {
    await registerMarketplace(workDir, pathToFileURL(marketplaceFixtureRoot).toString());
    await rm(getMarketplaceCacheRoot(workDir), { recursive: true, force: true });

    const listings = await listConfiguredMarketplacePlugins(workDir);

    expect(listings.map((listing) => listing.name)).toEqual(['core', 'product-management']);
    expect(await exists(join(getMarketplaceCacheRoot(workDir), 'bluelily'))).toBe(true);
  });
});

describe('formatMarketplaceRegistryTable', () => {
  it('formats a registry listing table', () => {
    const output = formatMarketplaceRegistryTable([
      {
        name: 'bluelilyc-tools',
        source: 'file:///tmp/bluelily',
        localPath: '.aipm/cache/marketplaces/bluelily',
        lastSyncedAt: '2026-05-04T00:00:00.000Z',
      },
    ]);

    const lines = output.split('\n');
    expect(lines[0]).toContain('Marketplace');
    expect(lines[0]).toContain('Local Path');
    expect(lines[2]).toContain('bluelilyc-tools');
  });
});

describe('formatMarketplacePluginTable', () => {
  it('formats a plugin listing table with notes', () => {
    const output = formatMarketplacePluginTable([
      {
        marketplace: 'bluelilyc-tools',
        name: 'core',
        version: '0.6.0',
        description: 'Core plugin',
        notes: 'Version mismatch',
      },
    ]);

    const lines = output.split('\n');
    expect(lines[0]).toContain('Plugin');
    expect(lines[0]).toContain('Description');
    expect(lines[0]).toContain('Notes');
    expect(lines[2]).toContain('Version mismatch');
  });
});
