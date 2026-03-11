<template>
  <div class="home">
    <h1 class="title">⚔ Auto Battle Card Game</h1>
    <p class="subtitle">Choose your mode</p>

    <div class="menu">
      <button class="btn btn--campaign" @click="playCampaign" :disabled="loading">
        <span class="btn__icon">🗺</span>
        <span class="btn__label">Campaign</span>
        <span class="btn__desc">Face the CPU Boss</span>
      </button>

      <button class="btn btn--arena" @click="playArena" :disabled="loading">
        <span class="btn__icon">🏆</span>
        <span class="btn__label">Arena</span>
        <span class="btn__desc">Challenge another player's deck</span>
      </button>
    </div>

    <p v-if="loading" class="status">Connecting to server...</p>
    <p v-if="store.error" class="error">{{ store.error }}</p>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useBattleStore } from '../stores/battle';
import type { DeckDefinition } from '@auto-battle/shared';

const store   = useBattleStore();
const loading = ref(false);

// Test deck – in a real game this would come from deck builder
const myDeck: DeckDefinition = {
  ownerId: 'Player1',
  heroCardId: 'hero_red_001',
  cardIds: [
    'creature_red_001',
    'creature_red_001',
    'creature_blue_001',
    'artifact_neutral_001',
    'spell_red_001',
  ],
};

function playCampaign() {
  loading.value = true;
  store.startCampaign(myDeck);
}

function playArena() {
  loading.value = true;
  store.startArena(myDeck);
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
