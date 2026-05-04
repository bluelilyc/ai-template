import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, readFile, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import {
  AIPM_SETTINGS_VERSION,
  createDefaultAipmSettings,
  getAipmSettingsPath,
  parseAipmSettings,
  readAipmSettings,
  writeAipmSettings,
} from '../src/settings.js';

let workDir: string;

beforeEach(async () => {
  workDir = await mkdtemp(join(tmpdir(), 'aipm-settings-'));
});

afterEach(async () => {
  await rm(workDir, { recursive: true, force: true });
});

describe('readAipmSettings', () => {
  it('returns defaults when the settings file does not exist', async () => {
    const settings = await readAipmSettings(workDir);

    expect(settings).toEqual(createDefaultAipmSettings());
  });
});

describe('parseAipmSettings', () => {
  it('rejects structurally invalid settings', () => {
    expect(() => parseAipmSettings({ version: 1, marketplaces: {}, plugins: [] })).toThrow(
      'Invalid AIPM settings file'
    );
  });
});

describe('writeAipmSettings', () => {
  it('writes validated settings and preserves them on read', async () => {
    const settings = {
      version: AIPM_SETTINGS_VERSION,
      marketplaces: [
        {
          name: 'bluelilyc-tools',
          source: 'bluelilyc/example-marketplace',
          resolvedSource: 'https://github.com/bluelilyc/example-marketplace.git',
          localPath: '.aipm/cache/marketplaces/bluelilyc-tools',
        },
      ],
      plugins: [
        {
          name: 'core',
          version: '0.6.0',
          marketplace: 'bluelilyc-tools',
          target: 'copilot' as const,
          sourceType: 'marketplace' as const,
          pluginPath: '.aipm/cache/marketplaces/bluelilyc-tools/core',
          installedAt: '2026-05-04T00:00:00.000Z',
          manifest: {
            name: 'core',
            version: '0.6.0',
            description: 'Core workflow plugin',
          },
          installedFiles: ['.github/agents/core.agent.md'],
        },
      ],
    };

    await writeAipmSettings(workDir, settings);

    const savedContent = await readFile(getAipmSettingsPath(workDir), 'utf-8');
    const readSettings = await readAipmSettings(workDir);

    expect(savedContent.endsWith('\n')).toBe(true);
    expect(readSettings).toEqual(settings);
  });
});