import { readFile, writeFile } from 'fs/promises';
import config from './rollup.config.js';

const PACKAGE_FILE = './package.json';

const pack = JSON.parse(await readFile(PACKAGE_FILE, 'utf8'));
pack.exports = buildExports();
await writeFile(PACKAGE_FILE, JSON.stringify(pack, null, 2));

function buildExports() {
  const result = {};
  const entries = config.input;
  for (const name in entries) {
    const src = entries[name];
    result[`./${name}`] = {
      import: `./dist/${name}.js`,
      types: `./dist/dts/${src.substring(4, src.length - 3)}.d.ts`,
    };
  }
  return result;
}