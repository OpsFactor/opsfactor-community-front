import { useThemeStore } from '@/stores/app/theme.store';

export function bootstrapTheme() {
  const themeStore = useThemeStore();
  themeStore.initialize();
}
