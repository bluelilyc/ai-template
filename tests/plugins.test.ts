import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { cp, mkdtemp, readFile, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { dirname, join, resolve } from 'path';
import { pathToFileURL } from 'url';
import {
  installMarketplacePlugin,
  removeMarketplacePlugin,
  updateMarketplacePlugins,
} from '../src/plugins.js';
import { registerMarketplace } from '../src/marketplaces.js';
import { readAipmSettings } from '../src/settings.js';

const fixtureRoot = resolve(process.cwd(), 'tests', 'fixtures', 'marketplaces', 'bluelily');

let workDir: string;
let marketplaceSourceDir: string;

beforeEach(async () => {
  workDir = await mkdtemp(join(tmpdir(), 'aipm-plugins-'));
  marketplaceSourceDir = await mkdtemp(join(tmpdir(), 'aipm-marketplace-source-'));
  await cp(fixtureRoot, marketplaceSourceDir, { recursive: true });
  await registerMarketplace(workDir, pathToFileURL(marketplaceSourceDir).toString());
});

afterEach(async () => {
  await rm(workDir, { recursive: true, force: true });
  await rm(marketplaceSourceDir, { recursive: true, force: true });
});

describe('installMarketplacePlugin', () => {
  it('installs a Copilot plugin and persists the install record', async () => {
    const result = await installMarketplacePlugin(workDir, 'core', {
      target: 'copilot',
      force: true,
    });
    const settings = await readAipmSettings(workDir);

    expect(await readFile(join(workDir, '.github', 'agents', 'core.agent.md'), 'utf-8')).toContain(
      '# core'
    );
    expect(await readFile(join(workDir, '.github', 'scripts', 'install.ps1'), 'utf-8')).toContain(
      'Write-Host'
    );
    expect(result.record.installedFiles).toContain('.github/hooks/core.json');
    expect(result.record.installedFiles).toContain('.github/scripts/install.ps1');
    expect(settings.plugins).toHaveLength(1);
    expect(settings.plugins[0].name).toBe('core');
  });

  it('installs a Claude plugin and writes the Claude plugin manifest', async () => {
    await installMarketplacePlugin(workDir, 'core', {
      target: 'claude',
      force: true,
    });

    expect(
      await readFile(join(workDir, '.claude', 'core', '.claude-plugin', 'plugin.json'), 'utf-8')
    ).toContain('"name": "core"');
    expect(await readFile(join(workDir, '.claude', 'core', 'scripts', 'install.ps1'), 'utf-8')).toContain(
      'Write-Host'
    );
  });
});

describe('updateMarketplacePlugins', () => {
  it('updates an installed plugin when the cached marketplace has a newer version', async () => {
    await installMarketplacePlugin(workDir, 'core', {
      target: 'copilot',
      force: true,
    });

    const sourceMarketplacePluginManifest = join(
      marketplaceSourceDir,
      'marketplace',
      'copilot',
      'plugins',
      'core',
      '.claude-plugin',
      'plugin.json'
    );

    await writeFile(
      sourceMarketplacePluginManifest,
      JSON.stringify(
        {
          name: 'core',
          description: 'Core workflow, review-evidence, transcript-hook, and shared repository-guidance plugin',
          version: '0.7.0',
          author: { name: 'Blue Lily EPMO' },
          agents: './agents/',
          skills: './skills/',
          hooks: './hooks/hooks.json',
        },
        null,
        2
      ) + '\n',
      'utf-8'
    );

    const results = await updateMarketplacePlugins(workDir, 'core', { force: true });
    const settings = await readAipmSettings(workDir);

    expect(results).toEqual([
      {
        plugin: 'core',
        updated: true,
        result: expect.objectContaining({
          record: expect.objectContaining({ version: '0.7.0' }),
        }),
      },
    ]);
    expect(settings.plugins[0].version).toBe('0.7.0');
  });

  it('returns an up-to-date result when the installed version matches', async () => {
    await installMarketplacePlugin(workDir, 'core', {
      target: 'copilot',
      force: true,
    });

    const results = await updateMarketplacePlugins(workDir, 'core', { force: true });

    expect(results).toEqual([
      {
        plugin: 'core',
        updated: false,
        reason: 'Already up to date',
      },
    ]);
  });

  it('removes stale files that are no longer part of the updated install plan', async () => {
    await installMarketplacePlugin(workDir, 'core', {
      target: 'copilot',
      force: true,
    });

    const sourcePluginRoot = join(marketplaceSourceDir, 'marketplace', 'copilot', 'plugins', 'core');
    const oldSkillFile = join(sourcePluginRoot, 'skills', 'review-evidence', 'SKILL.md');
    await rm(oldSkillFile, { force: true });
    await writeFile(
      join(sourcePluginRoot, '.claude-plugin', 'plugin.json'),
      JSON.stringify(
        {
          name: 'core',
          description: 'Core workflow, review-evidence, transcript-hook, and shared repository-guidance plugin',
          version: '0.7.0',
          author: { name: 'Blue Lily EPMO' },
          agents: './agents/',
          hooks: './hooks/hooks.json',
        },
        null,
        2
      ) + '\n',
      'utf-8'
    );

    await updateMarketplacePlugins(workDir, 'core', { force: true });

    await expect(
      readFile(join(workDir, '.github', 'skills', 'review-evidence', 'SKILL.md'), 'utf-8')
    ).rejects.toThrow();
  });
});

describe('removeMarketplacePlugin', () => {
  it('removes tracked files and clears the install record', async () => {
    await installMarketplacePlugin(workDir, 'core', {
      target: 'copilot',
      force: true,
    });

    const results = await removeMarketplacePlugin(workDir, 'core', { target: 'copilot' });
    const settings = await readAipmSettings(workDir);

    expect(results).toEqual([
      {
        name: 'core',
        target: 'copilot',
        removedFiles: expect.arrayContaining([
          '.github/agents/core.agent.md',
          '.github/hooks/core.json',
          '.github/scripts/install.ps1',
        ]),
      },
    ]);
    await expect(readFile(join(workDir, '.github', 'agents', 'core.agent.md'), 'utf-8')).rejects.toThrow();
    expect(settings.plugins).toEqual([]);
  });
});
