import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

/** Builds the edition-neutral Vue shell without bundling its host application dependencies. */
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
      // Host UI libraries remain peers of the shell. Keep roots and subpaths
      // external so both editions retain a single Vue/charting runtime.
      external: (moduleId) => ['vue', 'vue-router', 'primevue', 'echarts', 'vue-echarts', 'xlsx', 'ag-grid-community', 'ag-grid-vue3'].includes(moduleId)
        || moduleId.startsWith('primevue/')
        || moduleId.startsWith('echarts/'),
      output: {
        globals: { vue: 'Vue', 'vue-router': 'VueRouter' },
        preserveModules: true,
        preserveModulesRoot: 'src',
      },
    },
  },
});
