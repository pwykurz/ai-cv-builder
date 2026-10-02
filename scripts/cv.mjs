// One command: build -> render PDF -> check text layer.
//
//   npm run cv                    # cv.en (default)
//   npm run cv -- --data cv.pl    # another variant: cv.pl
//   npm run cv -- --all           # every variant in data/ and examples/
//
// A name is looked up in data/ (your own, gitignored) first, then in examples/.
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { listVariants } from './data-files.mjs';

const args = process.argv.slice(2);
const root = resolve(import.meta.dirname, '..');

let names;
if (args.includes('--all')) {
  names = listVariants();
} else {
  const i = args.indexOf('--data');
  names = [i >= 0 && args[i + 1] ? args[i + 1] : 'cv.en'];
}

const run = (cmd, cmdArgs) => {
  const result = spawnSync(cmd, cmdArgs, { cwd: root, stdio: 'inherit', shell: process.platform === 'win32' });
  return result.status ?? 1;
};

console.log('> build');
if (run('npm', ['run', 'build', '--silent']) !== 0) process.exit(1);

let failed = false;
for (const name of names) {
  console.log(`\n> ${name}: render`);
  if (run('node', ['scripts/render-pdf.mjs', '--data', name]) !== 0) {
    failed = true;
    continue;
  }
  console.log(`\n> ${name}: check`);
  if (run('node', ['scripts/check-pdf.mjs', '--data', name]) !== 0) failed = true;
}

process.exit(failed ? 1 : 0);
