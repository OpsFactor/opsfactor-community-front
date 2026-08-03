<template>
  <section class="ofx-card rounded-[12px] border shadow-[var(--ofx-shadow-md)] backdrop-blur-xl">
    <slot />
  </section>
</template>

<style scoped>
.ofx-card {
  border-color: rgb(255 255 255 / 0.07);
  background: rgb(13 20 35 / 0.82);
}

:global(:root[data-theme='light']) .ofx-card {
  border-color: var(--ofx-border);
  background: var(--ofx-surface);
}
</style>
