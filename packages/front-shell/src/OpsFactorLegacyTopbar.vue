<script setup lang="ts">
defineProps<{
  brandLogoUrl: string;
  currentModule?: string;
  themeMode: 'light' | 'dark';
}>();

defineEmits<{ quickActions: [] }>();
</script>

<template>
  <header
    class="relative z-[calc(var(--ofx-z-dropdown)_+_4)] border-b backdrop-blur-xl"
    :class="themeMode === 'light'
      ? 'border-[color:var(--ofx-border)] bg-[color:var(--ofx-surface)]'
      : 'border-white/6 bg-[color:rgb(7_12_22_/_0.74)]'"
  >
    <div class="mr-auto flex w-full max-w-none flex-col gap-3 px-4 py-3 sm:px-5 lg:flex-row lg:items-center lg:gap-5 lg:px-6">
      <!-- Keep the complete lockup visible in the wide shell; the standalone symbol is reserved for compact navigation and browser chrome. -->
      <img :src="brandLogoUrl" alt="OpsFactor" class="h-9 w-auto shrink-0 opacity-100 sm:h-10" />
      <h1 class="text-lg font-semibold lg:w-[13rem] lg:shrink-0" :class="themeMode === 'light' ? 'text-[color:var(--ofx-text)]' : 'text-white/92'">
        {{ currentModule ?? 'Workspace Home' }}
      </h1>
      <slot name="search" />
      <button
        type="button"
        class="hidden h-11 shrink-0 rounded-xl border px-4 text-sm transition lg:inline-flex lg:items-center"
        :class="themeMode === 'light'
          ? 'border-[color:var(--ofx-border)] bg-[color:var(--ofx-surface-elevated)] text-[color:var(--ofx-text-muted)] hover:border-[color:var(--ofx-border-strong)] hover:text-[color:var(--ofx-text)]'
          : 'border-white/8 bg-white/5 text-white/64 hover:bg-white/8 hover:text-white/92'"
        @click="$emit('quickActions')"
      >
        Quick actions
      </button>
    </div>
  </header>
</template>
