export interface InstallOptions {
  target: 'claude' | 'copilot';
  targetPath?: string;
  mergeMcp?: boolean;
  mcpSource?: string;
}

export interface TemplateFile {
  source: string;
  destination: string;
  type: 'agent' | 'prompt' | 'instruction' | 'skill';
}

export interface McpServerConfig {
  command: string;
  args?: string[];
  env?: Record<string, string>;
}

export interface McpConfig {
  mcpServers?: Record<string, McpServerConfig>;
}
