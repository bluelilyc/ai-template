import { promises as fs } from 'fs';
import { resolve } from 'path';
import {
  compareMarketplaceEntryToPluginManifest,
  readMarketplaceManifest,
  readPluginManifest,
  resolveMarketplacePluginRoot,
  syncRegisteredMarketplace,
} from './marketplaces.js';
import { readAipmSettings } from './settings.js';
import type { InstallTarget, MarketplaceRecord, PluginListing } from './types.js';

export interface InstalledPluginListing {
  name: string;
  version: string;
  description: string;
  marketplace: string;
  target: InstallTarget;
}

export interface MarketplaceRegistryListing {
  name: string;
  source: string;
  localPath: string;
  lastSyncedAt: string;
}

function isCacheMiss(error: unknown): boolean {
  return error instanceof Error && 'code' in error && (error as NodeJS.ErrnoException).code === 'ENOENT';
}

async function listMarketplaceRecordPlugins(
  workspaceRoot: string,
  marketplaceRecord: MarketplaceRecord
): Promise<PluginListing[]> {
  if (!marketplaceRecord.localPath) {
    const syncResult = await syncRegisteredMarketplace(workspaceRoot, marketplaceRecord.name);
    return listMarketplacePlugins(syncResult.localPath);
  }

  const localPath = resolve(workspaceRoot, marketplaceRecord.localPath);

  try {
    await fs.access(localPath);
    return await listMarketplacePlugins(localPath);
  } catch (error) {
    if (!isCacheMiss(error)) {
      throw error;
    }

    const syncResult = await syncRegisteredMarketplace(workspaceRoot, marketplaceRecord.name);
    return listMarketplacePlugins(syncResult.localPath);
  }
}

/**
 * List marketplace plugins from a synced marketplace repository.
 */
export async function listMarketplacePlugins(repoRoot: string): Promise<PluginListing[]> {
  const marketplace = await readMarketplaceManifest(repoRoot);

  const listings = await Promise.all(
    marketplace.plugins.map(async (plugin) => {
      const pluginRoot = resolveMarketplacePluginRoot(repoRoot, marketplace, plugin);
      const pluginManifest = await readPluginManifest(pluginRoot);
      const comparison = compareMarketplaceEntryToPluginManifest(plugin, pluginManifest.manifest);
      const notes = comparison.issues.join('; ');

      return {
        marketplace: marketplace.name,
        name: pluginManifest.manifest.name,
        version: pluginManifest.manifest.version ?? plugin.version ?? 'unknown',
        description: plugin.description ?? pluginManifest.manifest.description ?? '',
        notes: notes || undefined,
        manifestVersion: pluginManifest.manifest.version,
        marketplaceVersion: plugin.version,
      } satisfies PluginListing;
    })
  );

  return listings.sort((left, right) => left.name.localeCompare(right.name));
}

/**
 * List marketplace plugins from the workspaces registered AIPM marketplaces.
 */
export async function listConfiguredMarketplacePlugins(workspaceRoot: string): Promise<PluginListing[]> {
  const settings = await readAipmSettings(workspaceRoot);

  const listings = await Promise.all(
    settings.marketplaces.map((marketplaceRecord) =>
      listMarketplaceRecordPlugins(workspaceRoot, marketplaceRecord)
    )
  );

  return listings.flat().sort((left, right) => left.name.localeCompare(right.name));
}

/**
 * Format marketplace plugin listings including description and version mismatch notes.
 */
export function formatMarketplacePluginTable(listings: PluginListing[]): string {
  const nameHeader = 'Plugin';
  const versionHeader = 'Version';
  const descriptionHeader = 'Description';
  const notesHeader = 'Notes';

  const nameWidth = Math.max(nameHeader.length, ...listings.map((item) => item.name.length));
  const versionWidth = Math.max(versionHeader.length, ...listings.map((item) => item.version.length));
  const descriptionWidth = Math.max(
    descriptionHeader.length,
    ...listings.map((item) => item.description.length)
  );
  const notesWidth = Math.max(notesHeader.length, ...listings.map((item) => item.notes?.length ?? 0));

  const header = [
    nameHeader.padEnd(nameWidth),
    versionHeader.padEnd(versionWidth),
    descriptionHeader.padEnd(descriptionWidth),
    notesHeader.padEnd(notesWidth),
  ].join('  ');
  const separator = [
    '-'.repeat(nameWidth),
    '-'.repeat(versionWidth),
    '-'.repeat(descriptionWidth),
    '-'.repeat(notesWidth),
  ].join('  ');
  const rows = listings.map((item) =>
    [
      item.name.padEnd(nameWidth),
      item.version.padEnd(versionWidth),
      item.description.padEnd(descriptionWidth),
      (item.notes ?? '').padEnd(notesWidth),
    ].join('  ')
  );

  return [header, separator, ...rows].join('\n');
}

/**
 * List installed plugins from `.aipm/settings.json`.
 */
export async function listInstalledPlugins(workspaceRoot: string): Promise<InstalledPluginListing[]> {
  const settings = await readAipmSettings(workspaceRoot);

  return settings.plugins
    .map((plugin) => ({
      name: plugin.name,
      version: plugin.version,
      description: plugin.manifest.description ?? '',
      marketplace: plugin.marketplace,
      target: plugin.target,
    }))
    .sort((left, right) => left.name.localeCompare(right.name));
}

/**
 * List registered marketplaces from `.aipm/settings.json`.
 */
export async function listRegisteredMarketplaces(
  workspaceRoot: string
): Promise<MarketplaceRegistryListing[]> {
  const settings = await readAipmSettings(workspaceRoot);

  return settings.marketplaces
    .map((marketplace) => ({
      name: marketplace.name,
      source: marketplace.source,
      localPath: marketplace.localPath ?? '',
      lastSyncedAt: marketplace.lastSyncedAt ?? '',
    }))
    .sort((left, right) => left.name.localeCompare(right.name));
}

/**
 * Format a registered marketplace table.
 */
export function formatMarketplaceRegistryTable(listings: MarketplaceRegistryListing[]): string {
  const nameHeader = 'Marketplace';
  const sourceHeader = 'Source';
  const pathHeader = 'Local Path';
  const syncedHeader = 'Last Synced';

  const nameWidth = Math.max(nameHeader.length, ...listings.map((item) => item.name.length));
  const sourceWidth = Math.max(sourceHeader.length, ...listings.map((item) => item.source.length));
  const pathWidth = Math.max(pathHeader.length, ...listings.map((item) => item.localPath.length));
  const syncedWidth = Math.max(
    syncedHeader.length,
    ...listings.map((item) => item.lastSyncedAt.length)
  );

  const header = [
    nameHeader.padEnd(nameWidth),
    sourceHeader.padEnd(sourceWidth),
    pathHeader.padEnd(pathWidth),
    syncedHeader.padEnd(syncedWidth),
  ].join('  ');
  const separator = [
    '-'.repeat(nameWidth),
    '-'.repeat(sourceWidth),
    '-'.repeat(pathWidth),
    '-'.repeat(syncedWidth),
  ].join('  ');
  const rows = listings.map((item) =>
    [
      item.name.padEnd(nameWidth),
      item.source.padEnd(sourceWidth),
      item.localPath.padEnd(pathWidth),
      item.lastSyncedAt.padEnd(syncedWidth),
    ].join('  ')
  );

  return [header, separator, ...rows].join('\n');
}
