import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { join, resolve } from 'path';
import { pathToFileURL } from 'url';
import {
  getMarketplaceCacheRoot,
  normalizeMarketplaceSource,
  registerMarketplace,
} from '../src/marketplaces.js';
import { readAipmSettings } from '../src/settings.js';

const fixtureRoot = resolve(process.cwd(), 'tests', 'fixtures', 'marketplaces', 'bluelily');

let workDir: string;

beforeEach(async () => {
  workDir = await mkdtemp(join(tmpdir(), 'aipm-marketplace-'));
});

afterEach(async () => {
  await rm(workDir, { recursive: true, force: true });
});

describe('normalizeMarketplaceSource', () => {
  it('normalizes github shorthand sources', () => {
    expect(normalizeMarketplaceSource('bluelilyc/aipm-marketplace')).toEqual({
      input: 'bluelilyc/aipm-marketplace',
      kind: 'git',
      resolvedSource: 'https://github.com/bluelilyc/aipm-marketplace.git',
      cacheKey: 'bluelilyc-aipm-marketplace',
    });
  });

  it('normalizes file URI sources', () => {
    const source = pathToFileURL(fixtureRoot).toString();
    const normalized = normalizeMarketplaceSource(source);

    expect(normalized.kind).toBe('file');
    expect(normalized.filePath).toBe(fixtureRoot);
    expect(normalized.cacheKey).toBe('bluelily');
  });
});

describe('registerMarketplace', () => {
  it('syncs a file marketplace into the local cache and persists it to settings', async () => {
    const source = pathToFileURL(fixtureRoot).toString();

    const result = await registerMarketplace(workDir, source);
    const settings = await readAipmSettings(workDir);

    expect(result.manifest.name).toBe('bluelilyc-tools');
    expect(result.localPath).toBe(join(getMarketplaceCacheRoot(workDir), 'bluelily'));
    expect(settings.marketplaces).toHaveLength(1);
    expect(settings.marketplaces[0].name).toBe('bluelilyc-tools');
  });
});