<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useSessionStore } from '@/stores/app/session.store';
import { buildAppAssetPath } from '@/app/runtime/public-path';
import { loginWithPassword } from '@/services/auth/auth.service';

const route = useRoute();
const router = useRouter();
const sessionStore = useSessionStore();
const username = ref('');
const password = ref('');
const isSubmitting = ref(false);
const errorMessage = ref<string | null>(null);
const brandLogoUrl = computed(() => buildAppAssetPath('brand/opsfactor-dark.png'));

const message = computed(() => {
  if (route.query.error) {
    return {
      title: 'Login failed',
      body: 'The backend rejected the provided credentials. Verify the values and try again.',
    };
  }

  if (route.query.logout) {
    return {
      title: 'Session ended',
      body: 'Your in-memory Community credentials were cleared successfully.',
    };
  }

  return null;
});

watch(
  () => [sessionStore.isAuthenticated, sessionStore.isBootstrapping] as const,
  async ([isAuthenticated, isBootstrapping]) => {
    if (!isAuthenticated || isBootstrapping) return;
    const redirectPath = typeof route.query.redirect === 'string' ? route.query.redirect : '/';
    if (router.currentRoute.value.fullPath !== redirectPath) {
      await router.replace(redirectPath);
    }
  },
  { immediate: true },
);

async function handleLoginSubmit(event: Event) {
  event.preventDefault();

  if (!username.value.trim() || !password.value) {
    errorMessage.value = 'Enter both username and password.';
    return;
  }

  isSubmitting.value = true;
  errorMessage.value = null;

  try {
    await loginWithPassword(username.value, password.value);
    await sessionStore.bootstrap();

    const redirectPath = typeof route.query.redirect === 'string' ? route.query.redirect : '/';
    await router.replace(redirectPath);
  } catch (error) {
    errorMessage.value = error instanceof Error
      ? error.message
      : 'The backend rejected the provided credentials. Verify the values and try again.';
  } finally {
    isSubmitting.value = false;
  }
}
</script>

<template>
  <main
    class="login-page min-h-screen bg-[radial-gradient(circle_at_top,rgb(239_246_255),rgb(226_232_240)_54%)] px-6 py-10 text-[color:var(--ofx-text)]"
  >
    <div class="mx-auto flex min-h-[calc(100vh-5rem)] max-w-[460px] items-center">
      <section
        class="w-full rounded-[22px] border border-[color:var(--ofx-border)] bg-[color:rgb(255_255_255_/_0.94)] p-7 shadow-[var(--ofx-shadow-lg)] backdrop-blur-xl sm:p-9"
      >
        <div class="mb-8 space-y-4">
          <img :src="brandLogoUrl" alt="OpsFactor" class="h-10 w-auto">
          <div>
            <h1 class="text-3xl font-semibold tracking-[-0.04em] text-[color:var(--ofx-text)]">Sign in</h1>
          </div>
        </div>

        <div v-if="message" class="mb-6 rounded-[14px] border border-[color:rgb(211_155_42_/_0.26)] bg-[color:rgb(211_155_42_/_0.1)] px-4 py-3">
          <div class="text-sm font-medium text-[color:var(--ofx-text-warning)]">{{ message.title }}</div>
          <p class="mt-1 text-sm text-[color:var(--ofx-text-muted)]">{{ message.body }}</p>
        </div>

        <form class="space-y-5" @submit="handleLoginSubmit">
          <label class="flex flex-col gap-2">
            <span class="text-sm font-medium text-[color:var(--ofx-text)]">Username</span>
            <input v-model="username" name="username" type="text" autocomplete="username" class="h-12 rounded-[12px] border border-[color:var(--ofx-border)] bg-[color:var(--ofx-surface)] px-4 text-sm text-[color:var(--ofx-text)] outline-none transition focus:border-[color:rgb(90_128_255_/_0.42)]">
          </label>

          <label class="flex flex-col gap-2">
            <span class="text-sm font-medium text-[color:var(--ofx-text)]">Password</span>
            <input v-model="password" name="password" type="password" autocomplete="current-password" class="h-12 rounded-[12px] border border-[color:var(--ofx-border)] bg-[color:var(--ofx-surface)] px-4 text-sm text-[color:var(--ofx-text)] outline-none transition focus:border-[color:rgb(90_128_255_/_0.42)]">
          </label>

          <div v-if="errorMessage" class="rounded-[14px] border border-[color:rgb(186_74_74_/_0.32)] bg-[color:rgb(186_74_74_/_0.12)] px-4 py-3 text-sm text-[color:rgb(140_42_42)]">
            {{ errorMessage }}
          </div>

          <div class="flex items-center justify-between gap-3 pt-2">
            <button type="submit" class="inline-flex h-12 items-center justify-center rounded-[12px] bg-[color:var(--ofx-primary)] px-5 text-sm font-medium text-[color:var(--ofx-primary-foreground)]" :disabled="isSubmitting || !username.trim() || !password">
              {{ isSubmitting ? 'Signing in...' : 'Sign in' }}
            </button>
          </div>
        </form>
      </section>
    </div>
  </main>
</template>
