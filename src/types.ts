export interface InstallOptions {
  target: 'claude' | 'copilot';
  targetPath?: string;
  mergeMcp?: boolean;
  mcpSource?: string;
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
  author?: string | { name: string; email?: string; url?: string };
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
