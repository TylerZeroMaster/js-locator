import swc from '@rollup/plugin-swc';
import resolve from '@rollup/plugin-node-resolve';
import terser from '@rollup/plugin-terser';

const extensions = ['.js', '.ts'];

export default [
  {
    input: 'src/index.ts',
    output: {
      format: 'iife',
      name: 'JSLocator',
      file: 'out/index.js',
    },
    plugins: [
      resolve({
        browser: true,
        extensions,
      }),
      swc(),
      terser(),
    ],
  },
];
