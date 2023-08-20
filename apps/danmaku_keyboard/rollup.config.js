import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import svelte from 'rollup-plugin-svelte';
import typescript from '@rollup/plugin-typescript';
import scss from 'rollup-plugin-scss';
import resolve from '@rollup/plugin-node-resolve';
import sveltePreprocess from 'svelte-preprocess';
import postcss from 'postcss';
import tailwindcss from 'tailwindcss';
import autoprefixer from 'autoprefixer';
import pkg from './package.json' assert { type: 'json' };

const __dirname = dirname(fileURLToPath(import.meta.url));

export default {
  input: pkg.svelte,
  output: { file: pkg.main, format: 'es', assetFileNames: '[name][extname]' },
  plugins: [
    svelte({
      preprocess: sveltePreprocess({
        postcss: {
          configFilePath: join(__dirname, 'postcss.config.js')
        }
      })
    }),
    resolve(),
    typescript(),
    scss({
      name: 'index.css',
      processor: async (css, map) => {
        const processor = postcss([
          tailwindcss(join(__dirname, 'tailwind.config.js')),
          autoprefixer()
        ]);
        const result = await processor.process(css, { from: undefined });

        return {
          css: result.css,
          map: map
        };
      }
    })
  ]
};
