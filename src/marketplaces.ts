import { execFile } from 'child_process';
import { promises as fs } from 'fs';
import { basename, join, relative, resolve } from 'path';
import { fileURLToPath } from 'url';
import { promisify } from 'util';
import type {
  AgentPluginManifest,
  MarketplaceManifest,
  MarketplacePluginEntry,
  MarketplaceRecord,
  MarketplaceSyncResult,
  NormalizedPluginManifest,
  NormalizedMarketplaceSource,
  PluginAuthor,
  PluginDependency,
  PluginManifestComparison,
  PluginManifestLoadResult,
} from './types.js';
import { getAipmDirectory, readAipmSettings, writeAipmSettings } from './settings.js';

export const MARKETPLACE_MANIFEST_RELATIVE_PATH = join('.github', 'plugin', 'marketplace.json');
export const RECOGNIZED_PLUGIN_MANIFEST_PATHS = [
  join('.plugin', 'plugin.json'),
  'plugin.json',
  join('.github', 'plugin', 'plugin.json'),
  join('.claude-plugin', 'plugin.json'),
] as const;

const execFileAsync = promisify(execFile);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((entry) => typeof entry === 'string');
}

function isPluginAuthor(value: unknown): value is PluginAuthor {
  if (!isRecord(value)) {
    return false;
  }

  if (typeof value.name !== 'string') {
    return false;
  }

  if (value.email !== undefined && typeof value.email !== 'string') {
    return false;
  }

  if (value.url !== undefined && typeof value.url !== 'string') {
    return false;
  }

  return true;
}

function isPluginDependency(value: unknown): value is PluginDependency {
  if (!isRecord(value) || typeof value.name !== 'string') {
    return false;
  }

  if (value.version !== undefined && typeof value.version !== 'string') {
    return false;
  }

  return true;
}

function isPluginEntry(value: unknown): value is MarketplacePluginEntry {
  if (!isRecord(value)) {
    return false;
  }

  if (typeof value.name !== 'string' || typeof value.source !== 'string') {
    return false;
  }

  if (value.description !== undefined && typeof value.description !== 'string') {
    return false;
  }

  if (value.version !== undefined && typeof value.version !== 'string') {
    return false;
  }

  if (value.author !== undefined && !isPluginAuthor(value.author)) {
    return false;
  }

  if (value.category !== undefined && typeof value.category !== 'string') {
    return false;
  }

  if (value.tags !== undefined && !isStringArray(value.tags)) {
    return false;
  }

  if (value.strict !== undefined && typeof value.strict !== 'boolean') {
    return false;
  }

  return true;
}

function isPluginName(value: string): boolean {
  return /^[a-z0-9-]{1,64}$/.test(value);
}

function normalizePathList(value?: string | string[]): string[] {
  if (value === undefined) {
    return [];
  }

  return Array.isArray(value) ? value : [value];
}

function slugifySegment(value: string): string {
  return value.replace(/[^a-zA-Z0-9-]+/g, '-').replace(/^-+|-+$/g, '').toLowerCase();
}

async function pathExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function runGitCommand(args: string[], cwd?: string): Promise<void> {
  await execFileAsync('git', args, cwd ? { cwd } : undefined);
}

/**
 * Resolve the cache root used for synced marketplace repositories.
 */
export function getMarketplaceCacheRoot(workspaceRoot: string): string {
  return join(getAipmDirectory(workspaceRoot), 'cache', 'marketplaces');
}

/**
 * Normalize a user-provided marketplace source into a syncable source descriptor.
 */
export function normalizeMarketplaceSource(source: string): NormalizedMarketplaceSource {
  const trimmedSource = source.trim();

  if (trimmedSource.startsWith('file://')) {
    const filePath = fileURLToPath(trimmedSource);
    return {
      input: source,
      kind: 'file',
      resolvedSource: trimmedSource,
      cacheKey: slugifySegment(basename(filePath) || 'marketplace'),
      filePath,
    };
  }

  if (/^[^/\s]+\/[^/\s]+$/.test(trimmedSource)) {
    const [owner, repo] = trimmedSource.split('/');
    return {
      input: source,
      kind: 'git',
      resolvedSource: `https://github.com/${owner}/${repo}.git`,
      cacheKey: slugifySegment(`${owner}-${repo}`),
    };
  }

  if (/^https?:\/\/.+\.git$/i.test(trimmedSource)) {
    const repoName = trimmedSource.split('/').at(-1)?.replace(/\.git$/i, '') ?? 'marketplace';
    return {
      input: source,
      kind: 'git',
      resolvedSource: trimmedSource,
      cacheKey: slugifySegment(repoName),
    };
  }

  if (/^git@.+:.+\.git$/i.test(trimmedSource)) {
    const repoName = trimmedSource.split('/').at(-1)?.replace(/\.git$/i, '') ?? 'marketplace';
    return {
      input: source,
      kind: 'git',
      resolvedSource: trimmedSource,
      cacheKey: slugifySegment(repoName),
    };
  }

  throw new Error(`Unsupported marketplace source: ${source}`);
}

/**
 * Sync a marketplace source into the workspace-local cache.
 */
export async function syncMarketplaceSource(
  workspaceRoot: string,
  normalizedSource: NormalizedMarketplaceSource
): Promise<string> {
  const cacheRoot = getMarketplaceCacheRoot(workspaceRoot);
  const localPath = join(cacheRoot, normalizedSource.cacheKey);

  await fs.mkdir(cacheRoot, { recursive: true });

  if (normalizedSource.kind === 'file') {
    if (!normalizedSource.filePath) {
      throw new Error(`Marketplace file source is missing a file path: ${normalizedSource.input}`);
    }

    await fs.rm(localPath, { recursive: true, force: true });
    await fs.cp(normalizedSource.filePath, localPath, { recursive: true, force: true });
    return localPath;
  }

  if (await pathExists(localPath)) {
    await runGitCommand(['pull', '--ff-only'], localPath);
    return localPath;
  }

  await runGitCommand(['clone', normalizedSource.resolvedSource, localPath]);
  return localPath;
}

/**
 * Register a marketplace in `.aipm/settings.json` and sync it into the local cache.
 */
export async function registerMarketplace(
  workspaceRoot: string,
  source: string
): Promise<MarketplaceSyncResult> {
  const normalizedSource = normalizeMarketplaceSource(source);
  const localPath = await syncMarketplaceSource(workspaceRoot, normalizedSource);
  const manifest = await readMarketplaceManifest(localPath);
  const settings = await readAipmSettings(workspaceRoot);

  const record: MarketplaceRecord = {
    name: manifest.name,
    source,
    resolvedSource: normalizedSource.resolvedSource,
    localPath: relative(workspaceRoot, localPath).replace(/\\/g, '/'),
    lastSyncedAt: new Date().toISOString(),
  };

  settings.marketplaces = [
    ...settings.marketplaces.filter((entry) => entry.name !== record.name),
    record,
  ].sort((left, right) => left.name.localeCompare(right.name));

  await writeAipmSettings(workspaceRoot, settings);

  return {
    record,
    manifest,
    localPath,
  };
}

/**
 * Sync one registered marketplace by name and persist the refreshed cache path and timestamp.
 */
export async function syncRegisteredMarketplace(
  workspaceRoot: string,
  marketplaceName: string
): Promise<MarketplaceSyncResult> {
  const settings = await readAipmSettings(workspaceRoot);
  const record = settings.marketplaces.find((entry) => entry.name === marketplaceName);

  if (!record) {
    throw new Error(`Marketplace not found: ${marketplaceName}`);
  }

  const normalizedSource = normalizeMarketplaceSource(record.source);
  const localPath = await syncMarketplaceSource(workspaceRoot, normalizedSource);
  const manifest = await readMarketplaceManifest(localPath);
  const updatedRecord: MarketplaceRecord = {
    ...record,
    name: manifest.name,
    resolvedSource: normalizedSource.resolvedSource,
    localPath: relative(workspaceRoot, localPath).replace(/\\/g, '/'),
    lastSyncedAt: new Date().toISOString(),
  };

  settings.marketplaces = settings.marketplaces
    .map((entry) => (entry.name === marketplaceName ? updatedRecord : entry))
    .sort((left, right) => left.name.localeCompare(right.name));

  await writeAipmSettings(workspaceRoot, settings);

  return {
    record: updatedRecord,
    manifest,
    localPath,
  };
}

/**
 * Sync all registered marketplaces and persist their refreshed metadata.
 */
export async function syncRegisteredMarketplaces(
  workspaceRoot: string
): Promise<MarketplaceSyncResult[]> {
  const settings = await readAipmSettings(workspaceRoot);
  const results: MarketplaceSyncResult[] = [];

  for (const record of settings.marketplaces) {
    results.push(await syncRegisteredMarketplace(workspaceRoot, record.name));
  }

  return results;
}

/**
 * Read the marketplace manifest path from a cloned repository root.
 */
export function getMarketplaceManifestPath(repoRoot: string): string {
  return join(repoRoot, MARKETPLACE_MANIFEST_RELATIVE_PATH);
}

/**
 * Validate an unknown JSON value as a marketplace manifest.
 */
export function isMarketplaceManifest(value: unknown): value is MarketplaceManifest {
  if (!isRecord(value)) {
    return false;
  }

  if (typeof value.name !== 'string' || !isPluginName(value.name)) {
    return false;
  }

  if (!isPluginAuthor(value.owner)) {
    return false;
  }

  if (!isRecord(value.metadata)) {
    return false;
  }

  if (
    typeof value.metadata.description !== 'string' ||
    typeof value.metadata.version !== 'string' ||
    typeof value.metadata.pluginRoot !== 'string'
  ) {
    return false;
  }

  if (!Array.isArray(value.plugins) || !value.plugins.every(isPluginEntry)) {
    return false;
  }

  const names = new Set<string>();
  for (const plugin of value.plugins) {
    if (names.has(plugin.name)) {
      return false;
    }
    names.add(plugin.name);
  }

  return true;
}

/**
 * Parse an unknown JSON value into a validated marketplace manifest.
 */
export function parseMarketplaceManifest(value: unknown): MarketplaceManifest {
  if (!isMarketplaceManifest(value)) {
    throw new Error('Invalid marketplace manifest');
  }

  return value;
}

/**
 * Read a marketplace manifest from a cloned marketplace repository.
 */
export async function readMarketplaceManifest(repoRoot: string): Promise<MarketplaceManifest> {
  const manifestPath = getMarketplaceManifestPath(repoRoot);

  try {
    const content = await fs.readFile(manifestPath, 'utf-8');
    return parseMarketplaceManifest(JSON.parse(content) as unknown);
  } catch (error: unknown) {
    if (error instanceof SyntaxError) {
      throw new Error(`Invalid JSON in ${manifestPath}`);
    }

    throw error;
  }
}

/**
 * Resolve a plugin root using the marketplace pluginRoot and entry source fields.
 */
export function resolveMarketplacePluginRoot(
  repoRoot: string,
  marketplace: MarketplaceManifest,
  plugin: MarketplacePluginEntry
): string {
  return resolve(repoRoot, marketplace.metadata.pluginRoot, plugin.source);
}

/**
 * Return the recognized plugin manifest candidate paths for a plugin root.
 */
export function getRecognizedPluginManifestPaths(pluginRoot: string): string[] {
  return RECOGNIZED_PLUGIN_MANIFEST_PATHS.map((relativePath) => join(pluginRoot, relativePath));
}

/**
 * Find the first recognized plugin manifest path that exists on disk.
 */
export async function findPluginManifestPath(pluginRoot: string): Promise<string | null> {
  for (const candidatePath of getRecognizedPluginManifestPaths(pluginRoot)) {
    try {
      await fs.access(candidatePath);
      return candidatePath;
    } catch {
      // Continue to the next recognized manifest location.
    }
  }

  return null;
}

/**
 * Validate an unknown JSON value as a VS Code-compatible plugin manifest.
 */
export function isPluginManifest(value: unknown): value is AgentPluginManifest {
  if (!isRecord(value)) {
    return false;
  }

  if (typeof value.name !== 'string' || !isPluginName(value.name)) {
    return false;
  }

  if (value.description !== undefined && typeof value.description !== 'string') {
    return false;
  }

  if (value.version !== undefined && typeof value.version !== 'string') {
    return false;
  }

  if (value.author !== undefined && !isPluginAuthor(value.author)) {
    return false;
  }

  if (
    value.skills !== undefined &&
    typeof value.skills !== 'string' &&
    !isStringArray(value.skills)
  ) {
    return false;
  }

  if (
    value.agents !== undefined &&
    typeof value.agents !== 'string' &&
    !isStringArray(value.agents)
  ) {
    return false;
  }

  if (
    value.hooks !== undefined &&
    typeof value.hooks !== 'string' &&
    !isRecord(value.hooks)
  ) {
    return false;
  }

  if (
    value.mcpServers !== undefined &&
    typeof value.mcpServers !== 'string' &&
    !isRecord(value.mcpServers)
  ) {
    return false;
  }

  if (
    value.dependencies !== undefined &&
    (!Array.isArray(value.dependencies) || !value.dependencies.every(isPluginDependency))
  ) {
    return false;
  }

  return true;
}

/**
 * Parse an unknown JSON value into a validated plugin manifest.
 */
export function parsePluginManifest(value: unknown): AgentPluginManifest {
  if (!isPluginManifest(value)) {
    throw new Error('Invalid plugin manifest');
  }

  return value;
}

/**
 * Normalize plugin manifest path fields into a stable internal shape.
 */
export function normalizePluginManifest(
  manifest: AgentPluginManifest
): NormalizedPluginManifest {
  const normalizedManifest: NormalizedPluginManifest = {
    name: manifest.name,
    description: manifest.description,
    version: manifest.version,
    author: manifest.author,
    skills: normalizePathList(manifest.skills),
    agents: normalizePathList(manifest.agents),
    dependencies: manifest.dependencies ?? [],
  };

  if (typeof manifest.hooks === 'string') {
    normalizedManifest.hooksPath = manifest.hooks;
  } else if (manifest.hooks) {
    normalizedManifest.hooksInline = manifest.hooks;
  }

  if (typeof manifest.mcpServers === 'string') {
    normalizedManifest.mcpServersPath = manifest.mcpServers;
  } else if (manifest.mcpServers) {
    normalizedManifest.mcpServersInline = manifest.mcpServers;
  }

  return normalizedManifest;
}

/**
 * Read and normalize the first recognized plugin manifest beneath a plugin root.
 */
export async function readPluginManifest(pluginRoot: string): Promise<PluginManifestLoadResult> {
  const manifestPath = await findPluginManifestPath(pluginRoot);

  if (!manifestPath) {
    throw new Error(`No plugin manifest found in ${pluginRoot}`);
  }

  try {
    const content = await fs.readFile(manifestPath, 'utf-8');
    const manifest = parsePluginManifest(JSON.parse(content) as unknown);
    return {
      manifestPath,
      manifest,
      normalizedManifest: normalizePluginManifest(manifest),
    };
  } catch (error: unknown) {
    if (error instanceof SyntaxError) {
      throw new Error(`Invalid JSON in ${manifestPath}`);
    }

    throw error;
  }
}

/**
 * Compare marketplace entry metadata to plugin manifest identity fields.
 */
export function compareMarketplaceEntryToPluginManifest(
  plugin: MarketplacePluginEntry,
  manifest: AgentPluginManifest
): PluginManifestComparison {
  const issues: string[] = [];
  const nameMatches = plugin.name === manifest.name;
  const versionMatches = plugin.version === undefined || plugin.version === manifest.version;

  if (!nameMatches) {
    issues.push(
      `Marketplace plugin name "${plugin.name}" does not match manifest name "${manifest.name}"`
    );
  }

  if (!versionMatches) {
    issues.push(
      `Marketplace plugin version "${plugin.version}" does not match manifest version "${manifest.version}"`
    );
  }

  return {
    nameMatches,
    versionMatches,
    issues,
  };
}