<template>
  <div class="card" :class="`card--${card.type}`">
    <div class="card__header">
      <span class="card__name">{{ displayName }}</span>
      <span class="card__type-badge">{{ card.type }}</span>
    </div>

    <div class="card__stats">
      <span class="stat stat--hp">❤ {{ card.currentStats.hp }}/{{ card.currentStats.maxHp }}</span>
      <span class="stat stat--atk">⚔ {{ card.currentStats.attack }}</span>
      <span class="stat stat--cd" v-if="card.currentStats.cooldown > 0">
        ⏱ {{ card.currentStats.cooldown }}
      </span>
    </div>

    <!-- Equipped artifact -->
    <div class="card__artifact" v-if="card.equippedArtifact">
      🛡 {{ artifactName }}
    </div>

    <!-- Active status effects -->
    <div class="card__statuses" v-if="card.activeStatuses.length">
      <span
        v-for="s in card.activeStatuses"
        :key="s.type"
        class="status-badge"
        :class="`status--${s.type}`"
      >
        {{ s.type }} ×{{ s.remainingTurns }}
      </span>
    </div>

    <!-- HP bar -->
    <div class="card__hp-bar">
      <div
        class="card__hp-fill"
        :style="{ width: hpPercent + '%' }"
        :class="{ 'hp-low': hpPercent < 30 }"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { CardInstance } from '@auto-battle/shared';
// Vite resolves JSON imports natively
import cardData from '../../../shared/templates/cards.json';

const props = defineProps<{ card: CardInstance }>();

const templateMap = Object.fromEntries(
  (cardData as Array<{ cardId: string; name: string }>).map(c => [c.cardId, c])
);

const displayName  = computed(() => templateMap[props.card.cardId]?.name ?? props.card.cardId);
const artifactName = computed(() =>
  props.card.equippedArtifact
    ? (templateMap[props.card.equippedArtifact.cardId]?.name ?? props.card.equippedArtifact.cardId)
    : ''
);
const hpPercent = computed(() => {
  const { hp, maxHp } = props.card.currentStats;
  if (maxHp <= 0) return 0;
  return Math.max(0, Math.round((hp / maxHp) * 100));
});
</script>

<style scoped>
.card {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 8px 10px;
  border-radius: 8px;
  min-width: 110px;
  max-width: 130px;
  font-size: 12px;
  color: #f0f0f0;
  box-shadow: 0 2px 8px rgba(0,0,0,.5);
  user-select: none;
}

/* card type colours */
.card--hero     { background: linear-gradient(135deg, #4c1d95, #7c3aed); border: 2px solid #a78bfa; }
.card--creature { background: linear-gradient(135deg, #1e3a5f, #2563eb); border: 2px solid #60a5fa; }
.card--artifact { background: linear-gradient(135deg, #78350f, #d97706); border: 2px solid #fbbf24; }
.card--spell    { background: linear-gradient(135deg, #064e3b, #059669); border: 2px solid #34d399; }

.card__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 4px;
}

.card__name {
  font-weight: 700;
  font-size: 11px;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.card__type-badge {
  font-size: 9px;
  background: rgba(255,255,255,.15);
  border-radius: 4px;
  padding: 1px 4px;
  white-space: nowrap;
}

.card__stats {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.stat { font-size: 11px; }
.stat--hp  { color: #fca5a5; }
.stat--atk { color: #fde68a; }
.stat--cd  { color: #93c5fd; }

.card__artifact {
  font-size: 10px;
  color: #fde68a;
  background: rgba(0,0,0,.25);
  border-radius: 4px;
  padding: 1px 4px;
}

.card__statuses {
  display: flex;
  gap: 3px;
  flex-wrap: wrap;
}

.status-badge {
  font-size: 9px;
  padding: 1px 4px;
  border-radius: 4px;
  background: rgba(0,0,0,.3);
}
.status--burn   { color: #f97316; }
.status--poison { color: #86efac; }
.status--freeze { color: #bae6fd; }
.status--shield { color: #e2e8f0; }

.card__hp-bar {
  height: 4px;
  background: rgba(0,0,0,.4);
  border-radius: 2px;
  overflow: hidden;
  margin-top: 2px;
}

.card__hp-fill {
  height: 100%;
  background: #22c55e;
  border-radius: 2px;
  transition: width .4s ease;
}

.hp-low { background: #ef4444; }
</style>
