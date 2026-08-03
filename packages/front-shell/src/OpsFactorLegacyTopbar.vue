<script setup lang="ts">
defineProps<{
  brandLogoUrl: string;
  currentModule?: string;
  themeMode: 'light' | 'dark';
}>();
</script>

<template>
  <header
    class="relative z-[calc(var(--ofx-z-dropdown)_+_4)] border-b backdrop-blur-xl"
    :class="themeMode === 'light'
      ? 'border-[color:var(--ofx-border)] bg-[color:var(--ofx-surface)]'
      : 'border-white/6 bg-[color:rgb(7_12_22_/_0.74)]'"
  >
    <div class="mr-auto flex w-full max-w-none flex-col gap-4 px-3 py-4 sm:px-4 lg:px-5 xl:px-6">
      <div class="flex min-h-7 items-center gap-4">
        <img :src="brandLogoUrl" alt="OpsFactor" class="h-4 w-auto opacity-95" />
      </div>
      <div class="flex flex-col gap-3 xl:flex-row xl:items-center">
        <h1 class="text-lg font-semibold xl:w-[18rem] xl:shrink-0" :class="themeMode === 'light' ? 'text-[color:var(--ofx-text)]' : 'text-white/92'">
          {{ currentModule ?? 'Workspace Home' }}
        </h1>
        <slot name="search" />
        <button
          class="hidden h-11 rounded-xl border px-4 text-sm transition xl:inline-flex xl:items-center"
          :class="themeMode === 'light'
            ? 'border-[color:var(--ofx-border)] bg-[color:var(--ofx-surface-elevated)] text-[color:var(--ofx-text-muted)] hover:border-[color:var(--ofx-border-strong)] hover:text-[color:var(--ofx-text)]'
            : 'border-white/8 bg-white/5 text-white/64 hover:bg-white/8 hover:text-white/92'"
        >
          Quick actions
        </button>
      </div>
    </div>
  </header>
</template>
