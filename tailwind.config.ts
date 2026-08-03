import type { Config } from 'tailwindcss';

export default {
  content: [
    './index.html',
    './src/**/*.{vue,ts}',
    './packages/front-core/src/**/*.{vue,ts}',
    './packages/front-plan-history/src/**/*.{vue,ts}',
    './packages/front-perspective/src/**/*.{vue,ts}',
    './packages/front-shell/src/**/*.{vue,ts}',
    './packages/front-planning-book/src/**/*.{vue,ts}',
    './packages/front-processes/src/**/*.{vue,ts}',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
} satisfies Config;
