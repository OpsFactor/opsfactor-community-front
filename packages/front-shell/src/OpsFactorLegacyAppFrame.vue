<script setup lang="ts">
/**
 * Shared structural frame of the legacy Vue application.
 *
 * The applications keep their edition-specific route state and shell controls
 * in their local wrappers, while the DOM hierarchy and its responsive spacing
 * stay owned by the Community package consumed by both editions.
 */
defineProps<{
  showShellChrome: boolean;
}>();
</script>

<template>
  <div class="flex h-screen overflow-hidden bg-[color:var(--ofx-bg)] text-[color:var(--ofx-text)]">
    <slot name="sidebar" />
    <div class="min-w-0 flex-1 overflow-hidden lg:pl-[104px]">
      <div class="flex h-full min-h-0 flex-col">
        <main class="flex min-h-0 flex-1 flex-col overflow-x-hidden overflow-y-auto">
          <slot v-if="showShellChrome" name="topbar" />
          <slot v-if="showShellChrome" name="module-subnav" />
          <div :class="showShellChrome ? 'shrink-0' : 'flex min-h-0 flex-1 flex-col'">
            <slot />
          </div>
        </main>
      </div>
    </div>
  </div>
</template>
