import { readFile, writeFile } from 'fs/promises';
import { basename } from 'path';
import config from './rollup.config.js';

const PACKAGE_FILE = './package.json';

const pack = JSON.parse(await readFile(PACKAGE_FILE, 'utf8'));

pack.exports = await buildExports();

await writeFile(PACKAGE_FILE, JSON.stringify(pack, null, 2));

async function buildExports() {
  const result = {};
  for (const file of config.input) {
    const name = basename(file, '.ts');
    result[`./${name}`] = {
      import: `./dist/${name}.js`,
      types: `./dist/dts/${name}.d.ts`
    };
  }
  return result
}