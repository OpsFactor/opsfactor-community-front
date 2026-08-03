This directory exists to keep the PrimeVue boundary explicit.

Current Phase 2 adapters:
- `data-table/PrimeDataTableAdapter.vue`
- `multi-select/PrimeMultiSelectAdapter.vue`

Rules:
- Pages and module components import `Ofx*` components only.
- Raw PrimeVue imports stay inside this directory.
- Visual behavior must be normalized with design tokens, Tailwind utility classes, and wrapper contracts before it reaches app code.
