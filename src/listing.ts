import { promises as fs } from 'fs';
import { basename, join } from 'path';
import { readTemplateManifest } from './installer.js';

export interface TemplateListing {
  name: string;
  version: string;
}

export async function listTemplateManifests(templatesRoot: string): Promise<TemplateListing[]> {
  const entries = await fs.readdir(templatesRoot, { withFileTypes: true });
  const dirs = entries.filter((entry) => entry.isDirectory());

  const listings = await Promise.all(
    dirs.map(async (entry) => {
      const dirPath = join(templatesRoot, entry.name);
      const manifest = await readTemplateManifest(dirPath);
      return {
        name: manifest?.name ?? basename(dirPath),
        version: manifest?.version ?? 'unknown'
      } satisfies TemplateListing;
    })
  );

  return listings.sort((a, b) => a.name.localeCompare(b.name));
}

export function formatTemplateTable(listings: TemplateListing[]): string {
  const nameHeader = 'Plugin';
  const versionHeader = 'Version';

  const nameWidth = Math.max(nameHeader.length, ...listings.map((item) => item.name.length));
  const versionWidth = Math.max(versionHeader.length, ...listings.map((item) => item.version.length));

  const header = `${nameHeader.padEnd(nameWidth)}  ${versionHeader.padEnd(versionWidth)}`;
  const separator = `${'-'.repeat(nameWidth)}  ${'-'.repeat(versionWidth)}`;

  const rows = listings.map((item) => `${item.name.padEnd(nameWidth)}  ${item.version.padEnd(versionWidth)}`);

  return [header, separator, ...rows].join('\n');
}
