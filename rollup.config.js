import typescript from '@rollup/plugin-typescript';
import terser from '@rollup/plugin-terser';
import { readdirSync } from 'node:fs';
import { basename } from 'node:path';

const files = readdirSync('src', { withFileTypes: true });
const input = Object.fromEntries(files.map(e => {
  if (e.isDirectory()) {
    return [e.name, `src/${e.name}/index.ts`];
  } else {
    return [basename(e.name, '.ts'), `src/${e.name}`];
  }
}));

export default {
  input,
  plugins: [
    typescript({
      include: 'src/**/*',
    }),
    terser(),
  ],
  output: {
    dir: 'dist',
    format: 'es',
  },
  external: ['vue'],
};