import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, mkdir, writeFile, readFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import {
  getTargetDirectory,
  findTemplateFiles,
  installTemplates,
  mergeMcpConfig,
  readTemplateManifest
} from '../src/installer.js';

let workDir: string;

async function readJson<T>(filePath: string): Promise<T> {
  const content = await readFile(filePath, 'utf-8');
  return JSON.parse(content) as T;
}

beforeEach(async () => {
  workDir = await mkdtemp(join(tmpdir(), 'aipm-test-'));
});

afterEach(async () => {
  await rm(workDir, { recursive: true, force: true });
});

describe('getTargetDirectory', () => {
  it('returns claude path for claude target', () => {
    expect(getTargetDirectory('claude')).toBe('.github/claude');
  });

  it('returns .github for copilot target', () => {
    expect(getTargetDirectory('copilot')).toBe('.github');
  });

  it('returns custom path when provided', () => {
    expect(getTargetDirectory('copilot', 'custom/path')).toBe('custom/path');
  });
});

describe('findTemplateFiles', () => {
  it('finds agents, prompts, instructions, and skills', async () => {
    const baseDir = join(workDir, 'templates');
    await mkdir(join(baseDir, 'agents'), { recursive: true });
    await mkdir(join(baseDir, 'prompts'), { recursive: true });
    await mkdir(join(baseDir, 'instructions'), { recursive: true });
    await mkdir(join(baseDir, 'skills', 'testing.skill'), { recursive: true });

    await writeFile(join(baseDir, 'agents', 'quality-engineer.agent.md'), 'agent');
    await writeFile(join(baseDir, 'prompts', 'quality-review.prompt.md'), 'prompt');
    await writeFile(join(baseDir, 'instructions', 'quality-engineer.instructions.md'), 'instructions');
    await writeFile(join(baseDir, 'template.json'), JSON.stringify({ name: 'quality-engineer' }, null, 2));

    const files = await findTemplateFiles(baseDir);
    const destinations = files.map((file) => file.destination).sort();
    const types = files.map((file) => file.type).sort();

    expect(destinations).toEqual([
      join('agents', 'quality-engineer.agent.md'),
      join('instructions', 'quality-engineer.instructions.md'),
      join('prompts', 'quality-review.prompt.md'),
      join('skills', 'testing.skill')
    ].sort());

    expect(types).toEqual(['agent', 'instruction', 'prompt', 'skill'].sort());
  });
});

describe('readTemplateManifest', () => {
  it('reads a valid template.json manifest', async () => {
    const templateDir = join(workDir, 'pack');
    await mkdir(templateDir, { recursive: true });
    await writeFile(
      join(templateDir, 'template.json'),
      JSON.stringify({ name: 'quality-engineer', version: '1.0.0' }, null, 2)
    );

    const manifest = await readTemplateManifest(templateDir);

    expect(manifest).toEqual({ name: 'quality-engineer', version: '1.0.0' });
  });
});

describe('installTemplates', () => {
  it('copies templates into the target directory', async () => {
    const templateDir = join(workDir, 'pack');
    const targetDir = join(workDir, 'target');

    await mkdir(join(templateDir, 'agents'), { recursive: true });
    await writeFile(join(templateDir, 'agents', 'quality-engineer.agent.md'), 'agent-content');

    await installTemplates(templateDir, targetDir, {
      target: 'copilot',
      targetPath: targetDir,
      mergeMcp: false
    });

    const installed = await readFile(join(targetDir, 'agents', 'quality-engineer.agent.md'), 'utf-8');
    expect(installed).toBe('agent-content');
  });
});

describe('mergeMcpConfig', () => {
  it('merges new servers and skips invalid entries', async () => {
    const targetDir = join(workDir, 'target');
    const sourcePath = join(workDir, 'source-mcp.json');

    await mkdir(targetDir, { recursive: true });

    await writeFile(
      join(targetDir, 'mcp.json'),
      JSON.stringify({
        mcpServers: {
          existing: {
            command: 'node',
            args: ['server.js']
          }
        }
      }, null, 2)
    );

    await writeFile(
      sourcePath,
      JSON.stringify({
        mcpServers: {
          existing: {
            command: 'node',
            args: ['should-not-overwrite.js']
          },
          valid: {
            command: 'npx',
            args: ['-y', 'server']
          },
          invalid: {
            args: ['missing-command']
          }
        }
      }, null, 2)
    );

    await mergeMcpConfig(targetDir, sourcePath);

    const merged = await readJson<{ mcpServers: Record<string, { command: string }> }>(
      join(targetDir, 'mcp.json')
    );

    expect(Object.keys(merged.mcpServers).sort()).toEqual(['existing', 'valid']);
    expect(merged.mcpServers.existing.command).toBe('node');
    expect(merged.mcpServers.valid.command).toBe('npx');
  });
});
