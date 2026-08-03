import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

/** Builds the Community-owned process workspace without bundling host session infrastructure. */
export default defineConfig({
  plugins: [vue()],
  css: { postcss: { plugins: [] } },
  build: {
    lib: {
      entry: fileURLToPath(new URL('./src/index.ts', import.meta.url)),
      formats: ['es'],
      fileName: 'index',
    },
    rollupOptions: {
      external: (moduleId) => moduleId === 'vue'
        || moduleId === '@opsfactor/front-core'
        || moduleId === '@opsfactor/front-shell',
      output: {
        globals: { vue: 'Vue' },
        preserveModules: true,
        preserveModulesRoot: 'src',
      },
    },
  },
});
