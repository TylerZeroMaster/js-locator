import swc from '@rollup/plugin-swc';
import resolve from '@rollup/plugin-node-resolve';
import terser from '@rollup/plugin-terser';
import { dts } from 'rollup-plugin-dts';
import fs from 'fs';

const extensions = ['.js', '.ts'];
const pkg = JSON.parse(fs.readFileSync("./package.json"));
const banner = `/*! ${pkg.name} v${pkg.version} | ${pkg.license} License */`;

export default [ 
  {
    input: 'src/index.ts',
    output: {
      format: 'esm',
      file: 'dist/index.mjs',
      banner,
    },
    plugins: [
      resolve({ extensions }),
      swc(),
    ],
  },
  {
    input: 'src/index.ts',
    output: {
      format: 'iife',
      name: 'JSLocator',
      file: 'dist/index.js',
      banner,
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
  {
    input: 'types/index.d.ts',
    output: {
      file: 'dist/index.d.ts',
      format: 'es'
    },
    plugins: [dts()]
  }
];
