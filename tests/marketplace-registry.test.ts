import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { cp, mkdtemp, readFile, rm, writeFile, access } from 'fs/promises';
import { tmpdir } from 'os';
import { join, resolve } from 'path';
import { pathToFileURL } from 'url';
import { execFile } from 'child_process';
import { promisify } from 'util';
import {
  getMarketplaceCacheRoot,
  normalizeMarketplaceSource,
  registerMarketplace,
  syncMarketplaceSource,
  syncRegisteredMarketplace,
} from '../src/marketplaces.js';
import { readAipmSettings } from '../src/settings.js';

const fixtureRoot = resolve(process.cwd(), 'tests', 'fixtures', 'marketplaces', 'bluelily');
const execFileAsync = promisify(execFile);

let workDir: string;

async function exists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

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
    const gitignore = await readFile(join(workDir, '.gitignore'), 'utf-8');

    expect(result.manifest.name).toBe('bluelilyc-tools');
    expect(result.localPath).toBe(join(getMarketplaceCacheRoot(workDir), 'bluelily'));
    expect(settings.marketplaces).toHaveLength(1);
    expect(settings.marketplaces[0].name).toBe('bluelilyc-tools');
    expect(gitignore).toContain('.aipm/cache/');
  });

  it('stores only the marketplace manifest and plugin subtree for file sources', async () => {
    const sourceRoot = join(workDir, 'source-marketplace');
    await cp(fixtureRoot, sourceRoot, { recursive: true });
    await writeFile(join(sourceRoot, 'README.md'), '# ignored');
    await writeFile(join(sourceRoot, 'notes.txt'), 'ignore me');

    const result = await registerMarketplace(workDir, pathToFileURL(sourceRoot).toString());

    expect(await exists(join(result.localPath, '.github', 'plugin', 'marketplace.json'))).toBe(true);
    expect(
      await exists(
        join(
          result.localPath,
          'marketplace',
          'copilot',
          'plugins',
          'core',
          '.claude-plugin',
          'plugin.json'
        )
      )
    ).toBe(true);
    expect(await exists(join(result.localPath, 'README.md'))).toBe(false);
    expect(await exists(join(result.localPath, 'notes.txt'))).toBe(false);
  });

  it('syncs a registered marketplace by name', async () => {
    const source = pathToFileURL(fixtureRoot).toString();
    await registerMarketplace(workDir, source);

    const result = await syncRegisteredMarketplace(workDir, 'bluelilyc-tools');

    expect(result.record.name).toBe('bluelilyc-tools');
    expect(result.record.localPath).toBe('.aipm/cache/marketplaces/bluelily');
  });

  it('materializes a minimized cache for git sources', async () => {
    const gitSourceRoot = join(workDir, 'git-source');
    await cp(fixtureRoot, gitSourceRoot, { recursive: true });
    await writeFile(join(gitSourceRoot, 'README.md'), '# ignored');

    await execFileAsync('git', ['init'], { cwd: gitSourceRoot });
    await execFileAsync('git', ['config', 'user.name', 'AIPM Test'], { cwd: gitSourceRoot });
    await execFileAsync('git', ['config', 'user.email', 'aipm@example.com'], { cwd: gitSourceRoot });
    await execFileAsync('git', ['add', '.'], { cwd: gitSourceRoot });
    await execFileAsync('git', ['commit', '-m', 'fixture'], { cwd: gitSourceRoot });

    const localPath = await syncMarketplaceSource(workDir, {
      input: pathToFileURL(gitSourceRoot).toString(),
      kind: 'git',
      resolvedSource: pathToFileURL(gitSourceRoot).toString(),
      cacheKey: 'git-fixture',
    });

    expect(await exists(join(localPath, '.github', 'plugin', 'marketplace.json'))).toBe(true);
    expect(await exists(join(localPath, 'marketplace', 'copilot', 'plugins', 'product-management'))).toBe(
      true
    );
    expect(await exists(join(localPath, '.git'))).toBe(false);
    expect(await exists(join(localPath, 'README.md'))).toBe(false);
  });

  it('does not duplicate an existing cache ignore rule', async () => {
    await writeFile(join(workDir, '.gitignore'), '.aipm/cache/\nnode_modules/\n', 'utf-8');

    await registerMarketplace(workDir, pathToFileURL(fixtureRoot).toString());

    const gitignore = await readFile(join(workDir, '.gitignore'), 'utf-8');
    expect(gitignore.match(/^\.aipm\/cache\/$/gm)).toHaveLength(1);
  });

  it('does not add a cache entry when .aipm is already ignored', async () => {
    await writeFile(join(workDir, '.gitignore'), '.aipm/\n', 'utf-8');

    await registerMarketplace(workDir, pathToFileURL(fixtureRoot).toString());

    const gitignore = await readFile(join(workDir, '.gitignore'), 'utf-8');
    expect(gitignore.trim()).toBe('.aipm/');
  });
});