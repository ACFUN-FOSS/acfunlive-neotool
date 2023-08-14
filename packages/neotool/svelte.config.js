import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import adapter from '@sveltejs/adapter-static';
import sveltePreprocess from 'svelte-preprocess';

const __dirname = dirname(fileURLToPath(import.meta.url));

/** @type {import('@sveltejs/kit').Config} */
const config = {
  // Consult https://kit.svelte.dev/docs/integrations#preprocessors
  // for more information about preprocessors
  preprocess: sveltePreprocess({
    postcss: {
      configFilePath: join(__dirname, 'postcss.config.js')
    }
  }),

  kit: {
    // adapter-auto only supports some environments, see https://kit.svelte.dev/docs/adapter-auto for a list.
    // If your environment is not supported or you settled on a specific environment, switch out the adapter.
    // See https://kit.svelte.dev/docs/adapters for more information about adapters.
    adapter: adapter(),
    alias: {
      $apps: './apps'
    }
  }
};

export default config;
