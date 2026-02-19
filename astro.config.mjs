// @ts-check
import { defineConfig } from 'astro/config';
import svelte from '@astrojs/svelte';
import { fileURLToPath } from 'node:url';

// https://astro.build/config
export default defineConfig({
  output: 'static',
  integrations: [svelte()],
  vite: {
    resolve: {
      alias: {
        '$lib': fileURLToPath(new URL('./src/lib', import.meta.url)),
      }
    },
    ssr: {
      noExternal: true
    }
  },
  devToolbar: {
    enabled: false
  }
});