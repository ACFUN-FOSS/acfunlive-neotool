import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [sveltekit()],
  server: {
    fs: {
      allow: [
        'src-tauri/apps',
        '../event',
        '../session',
        '../shared',
        '../utils',
        '../../apps',
        '../../plugins'
      ]
    }
  }
});
