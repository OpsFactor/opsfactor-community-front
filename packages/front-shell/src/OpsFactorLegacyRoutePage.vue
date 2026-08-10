<script setup lang="ts">
import { computed } from 'vue';
import { RouterLink, useRoute } from 'vue-router';
import TaskPageLayout from './TaskPageLayout.vue';
import OfxPageHeader from './OfxPageHeader.vue';
import OfxSectionCard from './OfxSectionCard.vue';
import type { AppModuleCardLink, AppModuleSummary } from './legacy-navigation';

const route = useRoute();

const page = computed(() => route.meta.navigationPage as AppModuleCardLink | null | undefined);
const moduleInfo = computed(() => route.meta.navigationModule as AppModuleSummary | undefined);
const description = computed(() => (typeof route.meta.description === 'string' ? route.meta.description : undefined));
const legacyPath = computed(() => (typeof route.meta.legacyPath === 'string' ? route.meta.legacyPath : page.value?.legacyPath));
</script>

<template>
  <TaskPageLayout class="legacy-route-page">
    <OfxPageHeader
      :eyebrow="moduleInfo?.label"
      :title="typeof route.meta.title === 'string' ? route.meta.title : page?.label ?? 'Workspace'"
      :description="description"
    >
      <template #actions>
        <RouterLink
          v-if="moduleInfo"
          :to="moduleInfo.path"
          class="inline-flex rounded-[10px] border border-[color:var(--ofx-border)] px-4 py-2 text-sm text-[color:var(--ofx-text-muted)] transition hover:bg-[color:var(--ofx-surface-elevated)] hover:text-[color:var(--ofx-text)]"
        >
          Back to {{ moduleInfo.label }}
        </RouterLink>
      </template>
    </OfxPageHeader>

    <div class="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
      <OfxSectionCard title="Available workspace" description="This page is part of the current navigation. Its complete workflow is still being prepared.">
        <div class="space-y-4 text-sm leading-7 text-[color:var(--ofx-text-muted)]">
          <p>
            Use the related links to continue with an available task. Additional actions will appear here as they become available.
          </p>
          <p>
            This route uses the final product module, the final submenu slot, and generated search keywords, so navigation validation can start before every screen is fully rebuilt.
          </p>
        </div>
      </OfxSectionCard>

      <OfxSectionCard title="Reference" description="Source reference for this workspace.">
        <div class="space-y-4 text-sm text-[color:var(--ofx-text-muted)]">
          <div>
            <div class="text-[11px] uppercase tracking-[0.16em] text-[color:var(--ofx-text-subtle)]">Reference path</div>
            <div class="mt-2 rounded-[10px] border border-[color:var(--ofx-border)] bg-[color:var(--ofx-surface-elevated)] px-3 py-2 font-medium text-[color:var(--ofx-text)]">
              {{ legacyPath ?? 'Reference path not available.' }}
            </div>
          </div>

          <div>
            <div class="text-[11px] uppercase tracking-[0.16em] text-[color:var(--ofx-text-subtle)]">Keywords</div>
            <div class="mt-2 flex flex-wrap gap-2">
              <span
                v-for="keyword in page?.keywords ?? []"
                :key="keyword"
                class="rounded-full border border-[color:var(--ofx-border)] bg-[color:var(--ofx-surface-elevated)] px-2.5 py-1 text-[11px] text-[color:var(--ofx-text-muted)]"
              >
                {{ keyword }}
              </span>
            </div>
          </div>
        </div>
      </OfxSectionCard>
    </div>
  </TaskPageLayout>
</template>
