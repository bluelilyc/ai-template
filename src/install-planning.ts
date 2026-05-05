import { promises as fs } from 'fs';
import { join, relative, resolve } from 'path';
import type {
  InstallPlan,
  InstallPlanConflict,
  InstallPlanOperation,
  InstallPlanOptions,
  InstalledPluginRecord,
  InstallTarget,
  PluginManifestLoadResult,
} from './types.js';

function normalizeForComparison(filePath: string): string {
  return filePath.replace(/\\/g, '/');
}

async function pathExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function collectFiles(basePath: string): Promise<string[]> {
  const stats = await fs.stat(basePath);

  if (stats.isFile()) {
    return [basePath];
  }

  const entries = await fs.readdir(basePath, { withFileTypes: true });
  const nestedFiles = await Promise.all(
    entries.map(async (entry) => {
      const entryPath = join(basePath, entry.name);
      return entry.isDirectory() ? collectFiles(entryPath) : [entryPath];
    })
  );

  return nestedFiles.flat();
}

async function createDirectoryOperations(
  sourceRoot: string,
  destinationRoot: string,
  type: InstallPlanOperation['type']
): Promise<InstallPlanOperation[]> {
  const files = await collectFiles(sourceRoot);
  return files.map((sourcePath) => ({
    type,
    sourcePath,
    destinationPath: join(destinationRoot, relative(sourceRoot, sourcePath)),
    relativeDestinationPath: '',
  }));
}

function getCopilotTargetRoot(workspaceRoot: string): string {
  return join(workspaceRoot, '.github');
}

function getClaudeTargetRoot(workspaceRoot: string, pluginName: string): string {
  return join(workspaceRoot, '.claude', pluginName);
}

function getPluginOwner(
  installedPlugins: InstalledPluginRecord[],
  relativeDestinationPath: string,
  pluginName: string,
  target: InstallTarget
): InstalledPluginRecord | undefined {
  const normalizedPath = normalizeForComparison(relativeDestinationPath);
  return installedPlugins.find(
    (plugin) =>
      plugin.target === target &&
      plugin.name !== pluginName &&
      plugin.installedFiles.some((filePath) => normalizeForComparison(filePath) === normalizedPath)
  );
}

/**
 * Build a tracked install plan for a plugin without mutating the workspace.
 */
export async function createInstallPlan(
  workspaceRoot: string,
  pluginRoot: string,
  pluginManifest: PluginManifestLoadResult,
  options: InstallPlanOptions
): Promise<InstallPlan> {
  const installedPlugins = options.installedPlugins ?? [];
  const operations: InstallPlanOperation[] = [];
  const targetRoot =
    options.target === 'copilot'
      ? getCopilotTargetRoot(workspaceRoot)
      : getClaudeTargetRoot(workspaceRoot, pluginManifest.manifest.name);

  for (const agentPath of pluginManifest.normalizedManifest.agents) {
    const sourceRoot = resolve(pluginRoot, agentPath);
    const destinationRoot =
      options.target === 'copilot'
        ? join(targetRoot, 'agents')
        : join(targetRoot, 'agents');
    operations.push(...(await createDirectoryOperations(sourceRoot, destinationRoot, 'agent')));
  }

  for (const skillPath of pluginManifest.normalizedManifest.skills) {
    const sourceRoot = resolve(pluginRoot, skillPath);
    const destinationRoot =
      options.target === 'copilot'
        ? join(targetRoot, 'skills')
        : join(targetRoot, 'skills');
    operations.push(...(await createDirectoryOperations(sourceRoot, destinationRoot, 'skill')));
  }

  for (const scriptPath of pluginManifest.normalizedManifest.scripts) {
    const sourceRoot = resolve(pluginRoot, scriptPath);
    const destinationRoot =
      options.target === 'copilot'
        ? join(targetRoot, 'scripts')
        : join(targetRoot, 'scripts');
    operations.push(...(await createDirectoryOperations(sourceRoot, destinationRoot, 'skill')));
  }

  if (pluginManifest.normalizedManifest.hooksPath) {
    const sourcePath = resolve(pluginRoot, pluginManifest.normalizedManifest.hooksPath);
    operations.push({
      type: 'hooks',
      sourcePath,
      destinationPath:
        options.target === 'copilot'
          ? join(targetRoot, 'hooks', `${pluginManifest.manifest.name}.json`)
          : join(targetRoot, pluginManifest.normalizedManifest.hooksPath),
      relativeDestinationPath: '',
    });
  }

  if (pluginManifest.normalizedManifest.mcpServersPath) {
    const sourcePath = resolve(pluginRoot, pluginManifest.normalizedManifest.mcpServersPath);
    operations.push({
      type: 'mcp',
      sourcePath,
      destinationPath:
        options.target === 'copilot'
          ? join(targetRoot, 'mcp.json')
          : join(targetRoot, pluginManifest.normalizedManifest.mcpServersPath),
      relativeDestinationPath: '',
    });
  }

  if (options.target === 'claude') {
    operations.push({
      type: 'manifest',
      sourcePath: pluginManifest.manifestPath,
      destinationPath: join(targetRoot, '.claude-plugin', 'plugin.json'),
      relativeDestinationPath: '',
    });
  }

  const normalizedOperations = operations.map((operation) => ({
    ...operation,
    relativeDestinationPath: normalizeForComparison(relative(workspaceRoot, operation.destinationPath)),
  }));

  const conflicts: InstallPlanConflict[] = [];
  for (const operation of normalizedOperations) {
    if (!(await pathExists(operation.destinationPath))) {
      continue;
    }

    const owner = getPluginOwner(
      installedPlugins,
      operation.relativeDestinationPath,
      pluginManifest.manifest.name,
      options.target
    );

    if (owner) {
      conflicts.push({
        destinationPath: operation.destinationPath,
        relativeDestinationPath: operation.relativeDestinationPath,
        reason: 'managed-by-other-plugin',
        ownerPlugin: owner.name,
        requiresPrompt: !options.force,
      });
      continue;
    }

    const currentPluginRecord = installedPlugins.find(
      (plugin) => plugin.name === pluginManifest.manifest.name && plugin.target === options.target
    );
    const isManagedByCurrentPlugin = currentPluginRecord?.installedFiles.some(
      (filePath) => normalizeForComparison(filePath) === operation.relativeDestinationPath
    );

    conflicts.push({
      destinationPath: operation.destinationPath,
      relativeDestinationPath: operation.relativeDestinationPath,
      reason: isManagedByCurrentPlugin ? 'overwrite-managed' : 'existing-unmanaged',
      requiresPrompt: !options.force,
    });
  }

  return {
    pluginName: pluginManifest.manifest.name,
    target: options.target,
    operations: normalizedOperations,
    conflicts,
    requiresConfirmation: conflicts.some((conflict) => conflict.requiresPrompt),
  };
}