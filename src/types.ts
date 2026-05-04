export interface InstallOptions {
  target: 'claude' | 'copilot';
  targetPath?: string;
  mergeMcp?: boolean;
  mcpSource?: string;
}

export type InstallTarget = 'claude' | 'copilot';

export interface PluginAuthor {
  name: string;
  email?: string;
  url?: string;
}

export interface PluginDependency {
  name: string;
  version?: string;
}

export interface MarketplaceMetadata {
  description: string;
  version: string;
  pluginRoot: string;
}

export interface MarketplacePluginEntry {
  name: string;
  source: string;
  description?: string;
  version?: string;
  author?: PluginAuthor;
  category?: string;
  tags?: string[];
  strict?: boolean;
}

export interface MarketplaceManifest {
  name: string;
  owner: PluginAuthor;
  metadata: MarketplaceMetadata;
  plugins: MarketplacePluginEntry[];
}

export interface AgentPluginManifest {
  name: string;
  description?: string;
  version?: string;
  author?: PluginAuthor;
  skills?: string | string[];
  agents?: string | string[];
  hooks?: string | Record<string, unknown>;
  mcpServers?: string | Record<string, unknown>;
  dependencies?: PluginDependency[];
}

export interface NormalizedPluginManifest {
  name: string;
  description?: string;
  version?: string;
  author?: PluginAuthor;
  skills: string[];
  agents: string[];
  hooksPath?: string;
  hooksInline?: Record<string, unknown>;
  mcpServersPath?: string;
  mcpServersInline?: Record<string, unknown>;
  dependencies: PluginDependency[];
}

export interface PluginManifestLoadResult {
  manifestPath: string;
  manifest: AgentPluginManifest;
  normalizedManifest: NormalizedPluginManifest;
}

export interface PluginManifestComparison {
  nameMatches: boolean;
  versionMatches: boolean;
  issues: string[];
}

export interface MarketplaceRecord {
  name: string;
  source: string;
  resolvedSource?: string;
  localPath?: string;
  lastSyncedAt?: string;
}

export interface InstalledPluginManifestSnapshot {
  name: string;
  version?: string;
  description?: string;
  author?: PluginAuthor;
}

export interface InstalledPluginRecord {
  name: string;
  version: string;
  marketplace: string;
  target: InstallTarget;
  sourceType: 'marketplace';
  pluginPath: string;
  installedAt: string;
  manifest: InstalledPluginManifestSnapshot;
  installedFiles: string[];
}

export interface AipmSettings {
  version: number;
  marketplaces: MarketplaceRecord[];
  plugins: InstalledPluginRecord[];
}

export interface TemplateFile {
  source: string;
  destination: string;
  type: 'agent' | 'prompt' | 'instruction' | 'skill' | 'mcp';
}

export interface TemplateManifest {
  name: string;
  version?: string;
  description?: string;
  author?: string | PluginAuthor;
  license?: string;
  homepage?: string;
  repository?: string | { type?: string; url?: string };
  keywords?: string[];
  tags?: string[];
}

export interface McpServerConfig {
  command: string;
  args?: string[];
  env?: Record<string, string>;
}

export interface McpConfig {
  mcpServers?: Record<string, McpServerConfig>;
}
