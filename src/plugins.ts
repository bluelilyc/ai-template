import { promises as fs } from 'fs';
import { createInterface } from 'readline/promises';
import { stdin as input, stdout as output } from 'process';
import { dirname, resolve, relative } from 'path';
import { createInstallPlan } from './install-planning.js';
import {
  readMarketplaceManifest,
  readPluginManifest,
  resolveMarketplacePluginRoot,
  syncRegisteredMarketplace,
} from './marketplaces.js';
import { readAipmSettings, writeAipmSettings } from './settings.js';
import type {
  InstallPlan,
  InstallTarget,
  InstalledPluginRecord,
  MarketplacePluginEntry,
  MarketplaceRecord,
  MarketplaceSyncResult,
  PluginManifestLoadResult,
  RemovePluginResult,
} from './types.js';

interface ResolvePluginOptions {
  marketplaceName?: string;
}

interface InstallPluginOptions extends ResolvePluginOptions {
  target: InstallTarget;
  force?: boolean;
  confirm?: (plan: InstallPlan) => Promise<boolean>;
}

interface UpdatePluginsOptions {
  target?: InstallTarget;
  force?: boolean;
  confirm?: (plan: InstallPlan) => Promise<boolean>;
}

interface RemovePluginOptions {
  target?: InstallTarget;
}

export interface ResolvedMarketplacePlugin {
  marketplace: MarketplaceRecord;
  pluginEntry: MarketplacePluginEntry;
  pluginRoot: string;
  pluginManifest: PluginManifestLoadResult;
}

export interface InstallPluginResult {
  record: InstalledPluginRecord;
  plan: InstallPlan;
}

export interface UpdatePluginResult {
  plugin: string;
  updated: boolean;
  reason?: string;
  result?: InstallPluginResult;
}

async function pathExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function removeEmptyParentDirectories(startPath: string, stopPath: string): Promise<void> {
  let currentPath = dirname(startPath);
  const normalizedStopPath = resolve(stopPath);

  while (resolve(currentPath).startsWith(normalizedStopPath)) {
    try {
      const entries = await fs.readdir(currentPath);
      if (entries.length > 0) {
        return;
      }

      await fs.rmdir(currentPath);
      if (resolve(currentPath) === normalizedStopPath) {
        return;
      }
      currentPath = dirname(currentPath);
    } catch {
      return;
    }
  }
}

function getTargetCleanupRoot(workspaceRoot: string, target: InstallTarget, pluginName: string): string {
  return target === 'copilot'
    ? resolve(workspaceRoot, '.github')
    : resolve(workspaceRoot, '.claude', pluginName);
}

async function applyInstallPlan(workspaceRoot: string, plan: InstallPlan): Promise<void> {
  for (const operation of plan.operations) {
    await fs.mkdir(dirname(operation.destinationPath), { recursive: true });
    await fs.copyFile(operation.sourcePath, operation.destinationPath);
  }

  const cleanupRoot = getTargetCleanupRoot(workspaceRoot, plan.target, plan.pluginName);
  const currentRecordFiles = new Set(plan.operations.map((operation) => operation.relativeDestinationPath));
  const settings = await readAipmSettings(workspaceRoot);
  const previousRecord = settings.plugins.find(
    (plugin) => plugin.name === plan.pluginName && plugin.target === plan.target
  );

  if (!previousRecord) {
    return;
  }

  for (const previousFile of previousRecord.installedFiles) {
    if (currentRecordFiles.has(previousFile)) {
      continue;
    }

    const absolutePath = resolve(workspaceRoot, previousFile);
    if (!(await pathExists(absolutePath))) {
      continue;
    }

    await fs.rm(absolutePath, { force: true });
    await removeEmptyParentDirectories(absolutePath, cleanupRoot);
  }
}

function buildInstalledPluginRecord(
  workspaceRoot: string,
  marketplace: MarketplaceRecord,
  pluginRoot: string,
  pluginManifest: PluginManifestLoadResult,
  plan: InstallPlan
): InstalledPluginRecord {
  return {
    name: pluginManifest.manifest.name,
    version: pluginManifest.manifest.version ?? 'unknown',
    marketplace: marketplace.name,
    target: plan.target,
    sourceType: 'marketplace',
    pluginPath: relative(workspaceRoot, pluginRoot).replace(/\\/g, '/'),
    installedAt: new Date().toISOString(),
    manifest: {
      name: pluginManifest.manifest.name,
      version: pluginManifest.manifest.version,
      description: pluginManifest.manifest.description,
      author: pluginManifest.manifest.author,
    },
    installedFiles: plan.operations.map((operation) => operation.relativeDestinationPath),
  };
}

async function persistInstalledPluginRecord(
  workspaceRoot: string,
  record: InstalledPluginRecord
): Promise<void> {
  const settings = await readAipmSettings(workspaceRoot);
  settings.plugins = [
    ...settings.plugins.filter(
      (plugin) => !(plugin.name === record.name && plugin.target === record.target)
    ),
    record,
  ].sort((left, right) => left.name.localeCompare(right.name));

  await writeAipmSettings(workspaceRoot, settings);
}

async function resolvePluginFromSyncedMarketplace(
  syncResult: MarketplaceSyncResult,
  pluginName: string
): Promise<ResolvedMarketplacePlugin | null> {
  const pluginEntry = syncResult.manifest.plugins.find((plugin) => plugin.name === pluginName);
  if (!pluginEntry) {
    return null;
  }

  const pluginRoot = resolveMarketplacePluginRoot(syncResult.localPath, syncResult.manifest, pluginEntry);
  const pluginManifest = await readPluginManifest(pluginRoot);

  return {
    marketplace: syncResult.record,
    pluginEntry,
    pluginRoot,
    pluginManifest,
  };
}

/**
 * Prompt the user before overwriting files when a plan requires confirmation.
 */
export async function confirmInstallPlan(plan: InstallPlan): Promise<boolean> {
  if (!plan.requiresConfirmation) {
    return true;
  }

  const rl = createInterface({ input, output });
  const summary = plan.conflicts
    .map((conflict) => {
      const owner = conflict.ownerPlugin ? ` (${conflict.ownerPlugin})` : '';
      return `- ${conflict.relativeDestinationPath}: ${conflict.reason}${owner}`;
    })
    .join('\n');

  const answer = await rl.question(
    `The following files would be overwritten:\n${summary}\nProceed? [y/N] `
  );
  rl.close();

  return /^(y|yes)$/i.test(answer.trim());
}

/**
 * Resolve a plugin from the registered marketplaces, syncing the relevant marketplace first.
 */
export async function resolveMarketplacePlugin(
  workspaceRoot: string,
  pluginName: string,
  options: ResolvePluginOptions = {}
): Promise<ResolvedMarketplacePlugin> {
  const settings = await readAipmSettings(workspaceRoot);
  const candidateMarketplaces = options.marketplaceName
    ? settings.marketplaces.filter((marketplace) => marketplace.name === options.marketplaceName)
    : settings.marketplaces;

  if (candidateMarketplaces.length === 0) {
    throw new Error(options.marketplaceName ? `Marketplace not found: ${options.marketplaceName}` : 'No marketplaces configured');
  }

  for (const marketplace of candidateMarketplaces) {
    const syncResult = await syncRegisteredMarketplace(workspaceRoot, marketplace.name);
    const resolvedPlugin = await resolvePluginFromSyncedMarketplace(syncResult, pluginName);
    if (resolvedPlugin) {
      return resolvedPlugin;
    }
  }

  throw new Error(`Plugin not found: ${pluginName}`);
}

/**
 * Install a marketplace plugin into the selected target and persist the install record.
 */
export async function installMarketplacePlugin(
  workspaceRoot: string,
  pluginName: string,
  options: InstallPluginOptions
): Promise<InstallPluginResult> {
  const resolvedPlugin = await resolveMarketplacePlugin(workspaceRoot, pluginName, {
    marketplaceName: options.marketplaceName,
  });
  const settings = await readAipmSettings(workspaceRoot);
  const plan = await createInstallPlan(workspaceRoot, resolvedPlugin.pluginRoot, resolvedPlugin.pluginManifest, {
    target: options.target,
    force: options.force,
    installedPlugins: settings.plugins,
  });

  if (plan.requiresConfirmation) {
    const confirmed = options.confirm
      ? await options.confirm(plan)
      : await confirmInstallPlan(plan);

    if (!confirmed) {
      throw new Error('Installation cancelled');
    }
  }

  await applyInstallPlan(workspaceRoot, plan);
  const record = buildInstalledPluginRecord(
    workspaceRoot,
    resolvedPlugin.marketplace,
    resolvedPlugin.pluginRoot,
    resolvedPlugin.pluginManifest,
    plan
  );
  await persistInstalledPluginRecord(workspaceRoot, record);

  return {
    record,
    plan,
  };
}

/**
 * Update one installed plugin by name or all installed plugins.
 */
export async function updateMarketplacePlugins(
  workspaceRoot: string,
  pluginName: string | undefined,
  options: UpdatePluginsOptions = {}
): Promise<UpdatePluginResult[]> {
  const settings = await readAipmSettings(workspaceRoot);
  const candidates = pluginName
    ? settings.plugins.filter((plugin) => plugin.name === pluginName)
    : settings.plugins;

  if (candidates.length === 0) {
    throw new Error(pluginName ? `Installed plugin not found: ${pluginName}` : 'No installed plugins found');
  }

  const results: UpdatePluginResult[] = [];

  for (const candidate of candidates) {
    if (options.target && candidate.target !== options.target) {
      continue;
    }

    const resolvedPlugin = await resolveMarketplacePlugin(workspaceRoot, candidate.name, {
      marketplaceName: candidate.marketplace,
    });
    const nextVersion = resolvedPlugin.pluginManifest.manifest.version ?? 'unknown';
    if (nextVersion === candidate.version) {
      results.push({
        plugin: candidate.name,
        updated: false,
        reason: 'Already up to date',
      });
      continue;
    }

    const result = await installMarketplacePlugin(workspaceRoot, candidate.name, {
      marketplaceName: candidate.marketplace,
      target: candidate.target,
      force: options.force,
      confirm: options.confirm,
    });

    results.push({
      plugin: candidate.name,
      updated: true,
      result,
    });
  }

  return results;
}

async function removeInstalledPluginFiles(
  workspaceRoot: string,
  plugin: InstalledPluginRecord
): Promise<string[]> {
  const cleanupRoot = getTargetCleanupRoot(workspaceRoot, plugin.target, plugin.name);
  const removedFiles: string[] = [];

  for (const installedFile of plugin.installedFiles) {
    const absolutePath = resolve(workspaceRoot, installedFile);
    if (!(await pathExists(absolutePath))) {
      continue;
    }

    await fs.rm(absolutePath, { force: true });
    await removeEmptyParentDirectories(absolutePath, cleanupRoot);
    removedFiles.push(installedFile);
  }

  if (plugin.target === 'claude') {
    const pluginRoot = resolve(workspaceRoot, '.claude', plugin.name);
    await fs.rm(pluginRoot, { recursive: true, force: true });
  }

  return removedFiles;
}

/**
 * Remove one installed plugin from the selected target and delete its tracked files.
 */
export async function removeMarketplacePlugin(
  workspaceRoot: string,
  pluginName: string,
  options: RemovePluginOptions = {}
): Promise<RemovePluginResult[]> {
  const settings = await readAipmSettings(workspaceRoot);
  const candidates = settings.plugins.filter(
    (plugin) => plugin.name === pluginName && (!options.target || plugin.target === options.target)
  );

  if (candidates.length === 0) {
    throw new Error(`Installed plugin not found: ${pluginName}`);
  }

  const results: RemovePluginResult[] = [];
  for (const candidate of candidates) {
    const removedFiles = await removeInstalledPluginFiles(workspaceRoot, candidate);
    results.push({
      name: candidate.name,
      target: candidate.target,
      removedFiles,
    });
  }

  settings.plugins = settings.plugins.filter(
    (plugin) => !(plugin.name === pluginName && (!options.target || plugin.target === options.target))
  );
  await writeAipmSettings(workspaceRoot, settings);

  return results;
}