import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, mkdir, writeFile } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { formatTemplateTable, listTemplateManifests } from '../src/listing.js';

let workDir: string;

beforeEach(async () => {
  workDir = await mkdtemp(join(tmpdir(), 'aipm-list-'));
});

afterEach(async () => {
  await rm(workDir, { recursive: true, force: true });
});

describe('listTemplateManifests', () => {
  it('returns sorted template listings with defaults', async () => {
    const alphaDir = join(workDir, 'alpha');
    const betaDir = join(workDir, 'beta');

    await mkdir(alphaDir, { recursive: true });
    await mkdir(betaDir, { recursive: true });

    await writeFile(
      join(betaDir, 'template.json'),
      JSON.stringify({ name: 'beta-pack', version: '2.0.0' }, null, 2)
    );

    const listings = await listTemplateManifests(workDir);

    expect(listings).toEqual([
      { name: 'alpha', version: 'unknown' },
      { name: 'beta-pack', version: '2.0.0' }
    ]);
  });
});

describe('formatTemplateTable', () => {
  it('formats a table with headers and rows', () => {
    const listings = [
      { name: 'quality-engineer', version: '1.0.0' },
      { name: 'alpha', version: 'unknown' }
    ];
    const output = formatTemplateTable(listings);

    const nameWidth = Math.max('Plugin'.length, ...listings.map((item) => item.name.length));
    const versionWidth = Math.max('Version'.length, ...listings.map((item) => item.version.length));
    const header = `${'Plugin'.padEnd(nameWidth)}  ${'Version'.padEnd(versionWidth)}`;
    const separator = `${'-'.repeat(nameWidth)}  ${'-'.repeat(versionWidth)}`;
    const row1 = `${listings[0].name.padEnd(nameWidth)}  ${listings[0].version.padEnd(versionWidth)}`;
    const row2 = `${listings[1].name.padEnd(nameWidth)}  ${listings[1].version.padEnd(versionWidth)}`;

    const lines = output.split('\n');
    expect(lines[0]).toBe(header);
    expect(lines[1]).toBe(separator);
    expect(lines[2]).toBe(row1);
    expect(lines[3]).toBe(row2);
  });
});
