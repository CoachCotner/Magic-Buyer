#!/usr/bin/env node
// Runs every test suite. `npm test`
import { readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const suites = readdirSync(HERE).filter((f) => f.endsWith('.test.mjs')).sort();

let failed = 0, total = 0;
for (const suite of suites) {
  const r = spawnSync(process.execPath, [join(HERE, suite)], { encoding: 'utf8' });
  const line = (r.stdout.trim().split('\n').pop() || '').trim();
  const m = line.match(/(\d+) passed, (\d+) failed/);
  total += m ? Number(m[1]) : 0;
  if (r.status !== 0) { failed++; console.log(`FAIL  ${suite}\n${r.stdout}${r.stderr}`); }
  else console.log(`pass  ${suite.padEnd(26)} ${line}`);
}
console.log(`\n${suites.length} suites, ${total} assertions, ${failed} suite(s) failing\n`);
process.exit(failed ? 1 : 0);
