import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

/** Builds a distributable library; no application routes or API adapter live here. */
export default defineConfig({
  plugins: [vue()],
  // This distributable has self-contained component CSS and must not inherit the
  // consuming Community application's Tailwind/PostCSS configuration while Vite
  // walks parent directories looking for a config file.
  css: {
    postcss: {
      plugins: [],
    },
  },
  build: {
    lib: {
      entry: fileURLToPath(new URL('./src/index.ts', import.meta.url)),
      formats: ['es'],
      fileName: 'index',
    },
    rollupOptions: {
      external: ['vue', 'ag-grid-community', 'ag-grid-vue3', '@opsfactor/front-shell'],
      output: {
        globals: { vue: 'Vue' },
        preserveModules: true,
        preserveModulesRoot: 'src',
      },
    },
  },
});
