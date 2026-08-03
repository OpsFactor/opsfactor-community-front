import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

/** Builds the edition-neutral Perspective components without bundling host Vue or Perspective runtimes. */
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
      external: (moduleId) => moduleId === 'vue' || moduleId.startsWith('@perspective-dev/'),
      output: {
        globals: { vue: 'Vue' },
        preserveModules: true,
        preserveModulesRoot: 'src',
      },
    },
  },
});
