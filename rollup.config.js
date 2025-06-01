import typescript from '@rollup/plugin-typescript';
import terser from '@rollup/plugin-terser';
import { readdirSync } from 'node:fs';

export default {
  input: readdirSync('src', { withFileTypes: true }).map(e => `src/${e.name}${(e.isDirectory() ? '/index.ts' : '')}`),
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