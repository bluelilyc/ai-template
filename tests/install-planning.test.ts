import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { mkdtemp, mkdir, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join, resolve } from 'path';
import { createInstallPlan } from '../src/install-planning.js';
import { readMarketplaceManifest, readPluginManifest, resolveMarketplacePluginRoot } from '../src/marketplaces.js';

const fixtureRoot = resolve(process.cwd(), 'tests', 'fixtures', 'marketplaces', 'bluelily');

let workDir: string;

beforeEach(async () => {
  workDir = await mkdtemp(join(tmpdir(), 'aipm-install-plan-'));
});

afterEach(async () => {
  await rm(workDir, { recursive: true, force: true });
});

describe('createInstallPlan', () => {
  it('builds a Copilot install plan with flattened workspace destinations', async () => {
    const marketplace = await readMarketplaceManifest(fixtureRoot);
    const pluginRoot = resolveMarketplacePluginRoot(fixtureRoot, marketplace, marketplace.plugins[0]);
    const pluginManifest = await readPluginManifest(pluginRoot);

    const plan = await createInstallPlan(workDir, pluginRoot, pluginManifest, { target: 'copilot' });

    expect(plan.pluginName).toBe('core');
    expect(plan.operations.map((operation) => operation.relativeDestinationPath).sort()).toEqual([
      '.github/agents/core.agent.md',
      '.github/hooks/core.json',
      '.github/scripts/install.ps1',
      '.github/skills/review-evidence/SKILL.md',
    ]);
    expect(plan.requiresConfirmation).toBe(false);
  });

  it('builds a Claude install plan that preserves plugin structure', async () => {
    const marketplace = await readMarketplaceManifest(fixtureRoot);
    const pluginRoot = resolveMarketplacePluginRoot(fixtureRoot, marketplace, marketplace.plugins[0]);
    const pluginManifest = await readPluginManifest(pluginRoot);

    const plan = await createInstallPlan(workDir, pluginRoot, pluginManifest, { target: 'claude' });

    expect(plan.operations.map((operation) => operation.relativeDestinationPath).sort()).toEqual([
      '.claude/core/.claude-plugin/plugin.json',
      '.claude/core/agents/core.agent.md',
      '.claude/core/hooks/hooks.json',
      '.claude/core/scripts/install.ps1',
      '.claude/core/skills/review-evidence/SKILL.md',
    ]);
  });

  it('prompts on unmanaged overwrite by default and suppresses the prompt with force', async () => {
    const marketplace = await readMarketplaceManifest(fixtureRoot);
    const pluginRoot = resolveMarketplacePluginRoot(fixtureRoot, marketplace, marketplace.plugins[0]);
    const pluginManifest = await readPluginManifest(pluginRoot);

    await mkdir(join(workDir, '.github', 'agents'), { recursive: true });
    await writeFile(join(workDir, '.github', 'agents', 'core.agent.md'), 'local change');

    const defaultPlan = await createInstallPlan(workDir, pluginRoot, pluginManifest, {
      target: 'copilot',
    });
    const forcedPlan = await createInstallPlan(workDir, pluginRoot, pluginManifest, {
      target: 'copilot',
      force: true,
    });

    expect(defaultPlan.conflicts).toEqual([
      {
        destinationPath: join(workDir, '.github', 'agents', 'core.agent.md'),
        relativeDestinationPath: '.github/agents/core.agent.md',
        reason: 'existing-unmanaged',
        requiresPrompt: true,
      },
    ]);
    expect(defaultPlan.requiresConfirmation).toBe(true);
    expect(forcedPlan.requiresConfirmation).toBe(false);
  });

  it('detects files managed by another installed plugin', async () => {
    const marketplace = await readMarketplaceManifest(fixtureRoot);
    const pluginRoot = resolveMarketplacePluginRoot(fixtureRoot, marketplace, marketplace.plugins[0]);
    const pluginManifest = await readPluginManifest(pluginRoot);

    await mkdir(join(workDir, '.github', 'agents'), { recursive: true });
    await writeFile(join(workDir, '.github', 'agents', 'core.agent.md'), 'existing plugin');

    const plan = await createInstallPlan(workDir, pluginRoot, pluginManifest, {
      target: 'copilot',
      installedPlugins: [
        {
          name: 'other-plugin',
          version: '1.0.0',
          marketplace: 'bluelilyc-tools',
          target: 'copilot',
          sourceType: 'marketplace',
          pluginPath: '.aipm/cache/marketplaces/bluelily/other-plugin',
          installedAt: '2026-05-04T00:00:00.000Z',
          manifest: {
            name: 'other-plugin',
            version: '1.0.0',
          },
          installedFiles: ['.github/agents/core.agent.md'],
        },
      ],
    });

    expect(plan.conflicts[0]).toEqual({
      destinationPath: join(workDir, '.github', 'agents', 'core.agent.md'),
      relativeDestinationPath: '.github/agents/core.agent.md',
      reason: 'managed-by-other-plugin',
      ownerPlugin: 'other-plugin',
      requiresPrompt: true,
    });
  });
});