import { createRouter, createWebHistory } from 'vue-router';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'home',
      component: () => import('../views/HomeView.vue'),
    },
    {
      path: '/campaign',
      name: 'campaign',
      component: () => import('../views/CampaignMapView.vue'),
    },
    {
      path: '/arena',
      name: 'arena',
      component: () => import('../views/ArenaView.vue'),
    },
    {
      path: '/special',
      name: 'special',
      component: () => import('../views/SpecialMissionView.vue'),
    },
    {
      path: '/battle/:battleId',
      name: 'battle',
      component: () => import('../views/BattleView.vue'),
    },
    {
      path: '/:pathMatch(.*)*',
      redirect: '/',
    },
  ],
});

export default router;
