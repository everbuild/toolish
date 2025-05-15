import typescript from '@rollup/plugin-typescript';
import terser from '@rollup/plugin-terser';
import { readdirSync } from 'node:fs';

export default {
  input: readdirSync('src').map(f => `src/${f}`),
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
  external: ['vue']
};