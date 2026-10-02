// Where a CV variant's JSON lives. Same rule as the app (src/App.tsx): your own data/ (gitignored)
// wins over the fictional examples/ that ship with the repo.
import { existsSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const DIRS = ['data', 'examples'];

/** Path to <name>.json in data/, else examples/, else null. */
export function resolveDataFile(name) {
  for (const dir of DIRS) {
    const file = resolve(root, dir, `${name}.json`);
    if (existsSync(file)) return file;
  }
  return null;
}

/** Every variant name across data/ and examples/, without duplicates. */
export function listVariants() {
  const names = new Set();
  for (const dir of DIRS) {
    const path = resolve(root, dir);
    if (!existsSync(path)) continue;
    for (const f of readdirSync(path)) if (f.endsWith('.json')) names.add(f.replace(/\.json$/, ''));
  }
  return [...names].sort();
}
