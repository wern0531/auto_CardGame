<template>
  <div class="home">
    <h1 class="title">⚔ Auto Battle Card Game</h1>
    <p class="subtitle">選擇模式</p>

    <div class="menu">
      <button class="btn btn--campaign" @click="playCampaign">
        <span class="btn__icon">🗺</span>
        <span class="btn__label">戰役</span>
        <span class="btn__desc">組牌 → 挑戰 CPU 主將</span>
      </button>

      <button class="btn btn--arena" @click="playArena" :disabled="loading">
        <span class="btn__icon">🏆</span>
        <span class="btn__label">競技場</span>
        <span class="btn__desc">挑戰競技場對手</span>
      </button>
    </div>

    <p v-if="loading" class="status">連線中…</p>
    <p v-if="store.error" class="error">{{ store.error }}</p>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useBattleStore } from '../stores/battle';
import type { DeckDefinition } from '@auto-battle/shared';

const router  = useRouter();
const store   = useBattleStore();
const loading = ref(false);

// Arena fallback deck (used until arena also gets a deck builder)
const arenaFallbackDeck: DeckDefinition = {
  ownerId: 'Player1',
  heroCardId: 'hero_blue_001',
  cardIds: [
    'creature_red_001',
    'creature_red_002',
    'creature_red_003',
    'creature_blue_002',
    'creature_green_001',
    'artifact_neutral_001',
    'artifact_neutral_002',
    'spell_red_002',
    'spell_blue_001',
  ],
};

function playCampaign() {
  router.push('/deck');
}

function playArena() {
  loading.value = true;
  store.startArena(arenaFallbackDeck);
}
</script>

<style scoped>
.home {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: #0d0d1a;
  gap: 16px;
}

.title {
  font-size: 2.4rem;
  font-weight: 800;
  color: #e2e8f0;
  letter-spacing: 2px;
  margin: 0;
}

.subtitle {
  color: #94a3b8;
  font-size: 1rem;
  margin: 0;
}

.menu {
  display: flex;
  gap: 24px;
  margin-top: 8px;
}

.btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 24px 40px;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  transition: transform .15s, box-shadow .15s;
  min-width: 160px;
}

.btn:hover:not(:disabled) {
  transform: translateY(-3px);
  box-shadow: 0 8px 24px rgba(0,0,0,.5);
}

.btn:disabled { opacity: .5; cursor: not-allowed; }

.btn--campaign {
  background: linear-gradient(135deg, #4c1d95, #7c3aed);
  color: #f5f3ff;
  box-shadow: 0 4px 16px rgba(124,58,237,.4);
}

.btn--arena {
  background: linear-gradient(135deg, #78350f, #d97706);
  color: #fffbeb;
  box-shadow: 0 4px 16px rgba(217,119,6,.4);
}

.btn__icon  { font-size: 2rem; }
.btn__label { font-size: 1.2rem; font-weight: 700; }
.btn__desc  { font-size: .75rem; opacity: .8; }

.status { color: #60a5fa; }
.error  { color: #f87171; }
</style>
