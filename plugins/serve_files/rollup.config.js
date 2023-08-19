import resolve from '@rollup/plugin-node-resolve';
import typescript from '@rollup/plugin-typescript';
import pkg from './package.json' assert { type: 'json' };

export default [
  {
    input: 'guest-js/index.ts',
    external: Object.keys(pkg.dependencies || {}).concat(/^@tauri-apps\/api/),
    onwarn: (warning) => {
      throw Object.assign(new Error(), warning);
    },
    strictDeprecations: true,
    output: {
      file: pkg.module,
      format: 'es',
      sourcemap: true
    },
    plugins: [typescript()]
  },
  {
    input: 'guest-js/index.ts',
    onwarn: (warning) => {
      throw Object.assign(new Error(), warning);
    },
    strictDeprecations: true,
    output: {
      file: pkg.browser,
      format: 'es',
      sourcemap: true,
      entryFileNames: '[name].min.js'
    },
    plugins: [resolve(), typescript()]
  }
];
