import { promises as fs } from 'fs';
import { join, dirname, basename } from 'path';
import type { InstallOptions, TemplateFile, McpConfig, McpServerConfig } from './types.js';

/**
 * Get the target directory based on the installation target (Claude or Copilot)
 */
export function getTargetDirectory(target: 'claude' | 'copilot', customPath?: string): string {
  if (customPath) {
    return customPath;
  }
  
  // Default paths based on target
  if (target === 'claude') {
    return '.github/claude';
  } else {
    return '.github';
  }
}

/**
 * Ensure a directory exists, creating it if necessary
 */
export async function ensureDirectory(dirPath: string): Promise<void> {
  try {
    await fs.mkdir(dirPath, { recursive: true });
  } catch (error: any) {
    if (error.code !== 'EEXIST') {
      throw error;
    }
  }
}

/**
 * Copy a file from source to destination
 */
export async function copyFile(source: string, destination: string): Promise<void> {
  await ensureDirectory(dirname(destination));
  await fs.copyFile(source, destination);
}

/**
 * Copy a directory recursively
 */
export async function copyDirectory(source: string, destination: string): Promise<void> {
  await ensureDirectory(destination);
  
  const entries = await fs.readdir(source, { withFileTypes: true });
  
  for (const entry of entries) {
    const sourcePath = join(source, entry.name);
    const destPath = join(destination, entry.name);
    
    if (entry.isDirectory()) {
      await copyDirectory(sourcePath, destPath);
    } else {
      await copyFile(sourcePath, destPath);
    }
  }
}

/**
 * Read and parse JSON file
 */
export async function readJsonFile(filePath: string): Promise<any> {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(content);
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      return null;
    }
    throw error;
  }
}

/**
 * Write JSON file with formatting
 */
export async function writeJsonFile(filePath: string, data: any): Promise<void> {
  await ensureDirectory(dirname(filePath));
  await fs.writeFile(filePath, JSON.stringify(data, null, 2) + '\n', 'utf-8');
}

/**
 * Merge MCP configurations
 */
export async function mergeMcpConfig(
  targetPath: string,
  sourcePath: string
): Promise<void> {
  const targetMcpPath = join(targetPath, 'mcp.json');
  const sourceMcpPath = sourcePath;
  
  // Read source MCP config
  const sourceMcp = await readJsonFile(sourceMcpPath) as unknown;
  if (!isMcpConfig(sourceMcp) || !sourceMcp.mcpServers) {
    console.log('No MCP servers found in source configuration');
    return;
  }
  
  // Read or initialize target MCP config
  let targetMcp: McpConfig = await readJsonFile(targetMcpPath) || { mcpServers: {} };
  if (!targetMcp.mcpServers) {
    targetMcp.mcpServers = {};
  }
  
  // Merge configurations
  for (const [serverName, serverConfig] of Object.entries(sourceMcp.mcpServers)) {
    if (!isMcpServerConfig(serverConfig)) {
      console.log(`Warning: MCP server "${serverName}" has invalid configuration, skipping...`);
      continue;
    }
    if (targetMcp.mcpServers[serverName]) {
      console.log(`Warning: MCP server "${serverName}" already exists, skipping...`);
    } else {
      targetMcp.mcpServers[serverName] = serverConfig;
      console.log(`Added MCP server: ${serverName}`);
    }
  }
  
  // Write merged configuration
  await writeJsonFile(targetMcpPath, targetMcp);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isMcpConfig(value: unknown): value is McpConfig {
  if (!isRecord(value)) {
    return false;
  }

  if (!('mcpServers' in value)) {
    return true;
  }

  return isRecord((value as { mcpServers?: unknown }).mcpServers);
}

function isMcpServerConfig(value: unknown): value is McpServerConfig {
  if (!isRecord(value)) {
    return false;
  }

  const record = value as Record<string, unknown>;
  if (typeof record.command !== 'string') {
    return false;
  }

  if (record.args !== undefined) {
    if (!Array.isArray(record.args) || record.args.some((arg) => typeof arg !== 'string')) {
      return false;
    }
  }

  if (record.env !== undefined) {
    if (!isRecord(record.env) || Object.values(record.env).some((val) => typeof val !== 'string')) {
      return false;
    }
  }

  return true;
}

/**
 * Find all template files in a directory
 */
export async function findTemplateFiles(baseDir: string): Promise<TemplateFile[]> {
  const files: TemplateFile[] = [];
  
  async function scanDirectory(dir: string, relativePath: string = '') {
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = join(dir, entry.name);
        const relPath = join(relativePath, entry.name);
        
        if (entry.isDirectory()) {
          // Check if it's a skill directory
          if (entry.name.endsWith('.skill')) {
            files.push({
              source: fullPath,
              destination: relPath,
              type: 'skill'
            });
          } else {
            await scanDirectory(fullPath, relPath);
          }
        } else if (entry.isFile()) {
          // Categorize by file extension
          if (entry.name.endsWith('.agent.md')) {
            files.push({
              source: fullPath,
              destination: relPath,
              type: 'agent'
            });
          } else if (entry.name.endsWith('.prompt.md')) {
            files.push({
              source: fullPath,
              destination: relPath,
              type: 'prompt'
            });
          } else if (entry.name.endsWith('.instructions.md')) {
            files.push({
              source: fullPath,
              destination: relPath,
              type: 'instruction'
            });
          }
        }
      }
    } catch (error) {
      // Directory doesn't exist or not readable
    }
  }
  
  await scanDirectory(baseDir);
  return files;
}

/**
 * Install template files to target directory
 */
export async function installTemplates(
  templatesDir: string,
  targetDir: string,
  options: InstallOptions
): Promise<void> {
  const templates = await findTemplateFiles(templatesDir);
  
  if (templates.length === 0) {
    console.log('No template files found to install');
    return;
  }
  
  console.log(`Found ${templates.length} template(s) to install`);
  
  for (const template of templates) {
    const destPath = join(targetDir, template.destination);
    
    try {
      if (template.type === 'skill') {
        // Copy entire skill directory
        await copyDirectory(template.source, destPath);
        console.log(`✓ Installed skill directory: ${template.destination}`);
      } else {
        // Copy individual file
        await copyFile(template.source, destPath);
        console.log(`✓ Installed ${template.type}: ${template.destination}`);
      }
    } catch (error: any) {
      console.error(`✗ Failed to install ${template.destination}: ${error.message}`);
    }
  }
  
  // Handle MCP config merge if requested
  if (options.mergeMcp && options.mcpSource) {
    try {
      await mergeMcpConfig(targetDir, options.mcpSource);
    } catch (error: any) {
      console.error(`Warning: Failed to merge MCP configuration: ${error.message}`);
    }
  }
}
