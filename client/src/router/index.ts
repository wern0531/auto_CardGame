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
      path: '/deck',
      name: 'deck-builder',
      component: () => import('../views/DeckBuilderView.vue'),
    },
    {
      path: '/battle/:battleId',
      name: 'battle',
      component: () => import('../views/BattleView.vue'),
    },
  ],
});

export default router;
