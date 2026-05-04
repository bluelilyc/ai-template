import { promises as fs } from 'fs';
import { dirname, join } from 'path';
import type {
  AipmSettings,
  InstalledPluginManifestSnapshot,
  InstalledPluginRecord,
  InstallTarget,
  MarketplaceRecord,
  PluginAuthor,
} from './types.js';

export const AIPM_DIRECTORY_NAME = '.aipm';
export const AIPM_SETTINGS_FILE_NAME = 'settings.json';
export const AIPM_SETTINGS_VERSION = 1;

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

function isInstallTarget(value: unknown): value is InstallTarget {
  return value === 'copilot' || value === 'claude';
}

function isMarketplaceRecord(value: unknown): value is MarketplaceRecord {
  if (!isRecord(value)) {
    return false;
  }

  if (typeof value.name !== 'string' || typeof value.source !== 'string') {
    return false;
  }

  if (value.resolvedSource !== undefined && typeof value.resolvedSource !== 'string') {
    return false;
  }

  if (value.localPath !== undefined && typeof value.localPath !== 'string') {
    return false;
  }

  if (value.lastSyncedAt !== undefined && typeof value.lastSyncedAt !== 'string') {
    return false;
  }

  return true;
}

function isInstalledPluginManifestSnapshot(
  value: unknown
): value is InstalledPluginManifestSnapshot {
  if (!isRecord(value)) {
    return false;
  }

  if (typeof value.name !== 'string') {
    return false;
  }

  if (value.version !== undefined && typeof value.version !== 'string') {
    return false;
  }

  if (value.description !== undefined && typeof value.description !== 'string') {
    return false;
  }

  if (value.author !== undefined && !isPluginAuthor(value.author)) {
    return false;
  }

  return true;
}

function isInstalledPluginRecord(value: unknown): value is InstalledPluginRecord {
  if (!isRecord(value)) {
    return false;
  }

  if (
    typeof value.name !== 'string' ||
    typeof value.version !== 'string' ||
    typeof value.marketplace !== 'string' ||
    !isInstallTarget(value.target) ||
    value.sourceType !== 'marketplace' ||
    typeof value.pluginPath !== 'string' ||
    typeof value.installedAt !== 'string' ||
    !isInstalledPluginManifestSnapshot(value.manifest) ||
    !isStringArray(value.installedFiles)
  ) {
    return false;
  }

  return true;
}

export function getAipmDirectory(rootDir: string): string {
  return join(rootDir, AIPM_DIRECTORY_NAME);
}

export function getAipmSettingsPath(rootDir: string): string {
  return join(getAipmDirectory(rootDir), AIPM_SETTINGS_FILE_NAME);
}

/**
 * Create the default workspace-local AIPM settings structure.
 */
export function createDefaultAipmSettings(): AipmSettings {
  return {
    version: AIPM_SETTINGS_VERSION,
    marketplaces: [],
    plugins: [],
  };
}

/**
 * Validate an unknown JSON value as an AIPM settings document.
 */
export function isAipmSettings(value: unknown): value is AipmSettings {
  if (!isRecord(value)) {
    return false;
  }

  if (typeof value.version !== 'number') {
    return false;
  }

  if (!Array.isArray(value.marketplaces) || !value.marketplaces.every(isMarketplaceRecord)) {
    return false;
  }

  if (!Array.isArray(value.plugins) || !value.plugins.every(isInstalledPluginRecord)) {
    return false;
  }

  return true;
}

/**
 * Parse an unknown JSON value into validated AIPM settings.
 */
export function parseAipmSettings(value: unknown): AipmSettings {
  if (!isAipmSettings(value)) {
    throw new Error('Invalid AIPM settings file');
  }

  return value;
}

/**
 * Read `.aipm/settings.json`, returning defaults when the file does not exist.
 */
export async function readAipmSettings(rootDir: string): Promise<AipmSettings> {
  const settingsPath = getAipmSettingsPath(rootDir);

  try {
    const content = await fs.readFile(settingsPath, 'utf-8');
    return parseAipmSettings(JSON.parse(content) as unknown);
  } catch (error: unknown) {
    if (isRecord(error) && error.code === 'ENOENT') {
      return createDefaultAipmSettings();
    }

    if (error instanceof SyntaxError) {
      throw new Error(`Invalid JSON in ${settingsPath}`);
    }

    throw error;
  }
}

/**
 * Write validated AIPM settings back to the workspace.
 */
export async function writeAipmSettings(rootDir: string, settings: AipmSettings): Promise<void> {
  const settingsPath = getAipmSettingsPath(rootDir);
  const validatedSettings = parseAipmSettings(settings);

  await fs.mkdir(dirname(settingsPath), { recursive: true });
  await fs.writeFile(settingsPath, JSON.stringify(validatedSettings, null, 2) + '\n', 'utf-8');
}