import type { RouteRecordRaw } from 'vue-router';
import { ROUTE_NAMES } from '../route-names';

export const authRoutes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: ROUTE_NAMES.login,
    component: () => import('@/modules/auth/pages/LoginPage.vue'),
    meta: {
      title: 'Login',
      requiresAuth: false,
    },
  },
];
