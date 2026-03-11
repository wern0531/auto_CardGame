<template>
  <div
    class="card"
    :class="[`card--${card.type}`, { 'card--ready': isReady }]"
  >
    <!-- ── Card face content ─────────────────────────────────────────────── -->
    <div class="card__header">
      <span class="card__name">{{ displayName }}</span>
      <span class="card__type-badge">{{ typeLabel }}</span>
    </div>

    <div class="card__stats">
      <span class="stat stat--hp">❤ {{ card.currentStats.hp }}/{{ card.currentStats.maxHp }}</span>
      <span class="stat stat--atk">⚔ {{ card.currentStats.attack }}</span>
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
        {{ s.type[0].toUpperCase() }}{{ s.remainingTurns }}
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

    <!-- ── Cooldown overlay (hand only, cd > 0) ───────────────────────────── -->
    <Transition name="overlay-fade">
      <div
        v-if="showCooldownOverlay"
        class="card__cooldown-overlay"
        :aria-label="`Ready in ${card.currentStats.cooldown} turns`"
      >
        <span class="overlay__icon">⏳</span>
        <span class="overlay__num">{{ card.currentStats.cooldown }}</span>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { CardInstance } from '@auto-battle/shared';
import cardData from '../../../shared/templates/cards.json';

const props = defineProps<{ card: CardInstance }>();

const templateMap = Object.fromEntries(
  (cardData as Array<{ cardId: string; name: string }>).map(c => [c.cardId, c])
);

const displayName  = computed(() => templateMap[props.card.cardId]?.name ?? props.card.cardId);

const typeLabels: Record<string, string> = {
  hero: '主將', creature: '生物', artifact: '裝備', spell: '法術',
};
const typeLabel = computed(() => typeLabels[props.card.type] ?? props.card.type);
const artifactName = computed(() =>
  props.card.equippedArtifact
    ? (templateMap[props.card.equippedArtifact.cardId]?.name ?? props.card.equippedArtifact.cardId)
    : ''
);

const hpPercent = computed(() => {
  const { hp, maxHp } = props.card.currentStats;
  return maxHp <= 0 ? 0 : Math.max(0, Math.round((hp / maxHp) * 100));
});

// Cooldown overlay: only when sitting in hand with cd > 0
const showCooldownOverlay = computed(() =>
  props.card.currentZone === 'hand' && props.card.currentStats.cooldown > 0
);

// Ready-to-deploy glow: in hand with cd === 0
const isReady = computed(() =>
  props.card.currentZone === 'hand' && props.card.currentStats.cooldown === 0
);
</script>

<style scoped>
/* ── Base card ───────────────────────────────────────────────────────────── */
.card {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 8px 10px 6px;
  border-radius: 8px;
  min-width: 110px;
  max-width: 130px;
  font-size: 12px;
  color: #f0f0f0;
  box-shadow: 0 2px 8px rgba(0, 0, 0, .5);
  user-select: none;
  flex-shrink: 0;
  transition: box-shadow .3s ease;
}

/* ── Type colour themes ──────────────────────────────────────────────────── */
.card--hero     { background: linear-gradient(135deg, #4c1d95, #7c3aed); border: 2px solid #a78bfa; }
.card--creature { background: linear-gradient(135deg, #1e3a5f, #2563eb); border: 2px solid #60a5fa; }
.card--artifact { background: linear-gradient(135deg, #78350f, #d97706); border: 2px solid #fbbf24; }
.card--spell    { background: linear-gradient(135deg, #064e3b, #059669); border: 2px solid #34d399; }

/* ── Ready-to-deploy: gold pulse glow ────────────────────────────────────── */
.card--ready {
  box-shadow:
    0 0 0 2px #fbbf24,
    0 0 14px 4px rgba(251, 191, 36, .55);
  animation: pulse-ready 1.4s ease-in-out infinite;
}

@keyframes pulse-ready {
  0%, 100% { box-shadow: 0 0 0 2px #fbbf24, 0 0 12px 3px rgba(251, 191, 36, .4); }
  50%       { box-shadow: 0 0 0 2px #fbbf24, 0 0 22px 8px rgba(251, 191, 36, .8); }
}

/* ── Header ──────────────────────────────────────────────────────────────── */
.card__header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 4px;
}

.card__name {
  font-weight: 700;
  font-size: 11px;
  line-height: 1.3;
  word-break: break-word;
}

.card__type-badge {
  font-size: 9px;
  background: rgba(255,255,255,.15);
  border-radius: 4px;
  padding: 1px 4px;
  white-space: nowrap;
  flex-shrink: 0;
}

/* ── Stats ───────────────────────────────────────────────────────────────── */
.card__stats {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.stat       { font-size: 11px; }
.stat--hp   { color: #fca5a5; }
.stat--atk  { color: #fde68a; }

/* ── Artifact ────────────────────────────────────────────────────────────── */
.card__artifact {
  font-size: 10px;
  color: #fde68a;
  background: rgba(0,0,0,.25);
  border-radius: 4px;
  padding: 1px 4px;
}

/* ── Status badges ───────────────────────────────────────────────────────── */
.card__statuses {
  display: flex;
  gap: 3px;
  flex-wrap: wrap;
}

.status-badge {
  font-size: 9px;
  padding: 1px 4px;
  border-radius: 4px;
  background: rgba(0,0,0,.35);
  font-weight: 700;
}

.status--burn   { color: #fb923c; }
.status--poison { color: #86efac; }
.status--freeze { color: #bae6fd; }
.status--shield { color: #e2e8f0; }

/* ── HP bar ──────────────────────────────────────────────────────────────── */
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

/* ── Cooldown overlay ────────────────────────────────────────────────────── */
.card__cooldown-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, .72);
  border-radius: 6px;        /* slightly less than card's 8px */
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0;
  pointer-events: none;      /* don't block hover on parent */
}

.overlay__icon {
  font-size: 26px;
  line-height: 1;
}

.overlay__num {
  font-size: 28px;
  font-weight: 900;
  color: #93c5fd;
  line-height: 1.1;
  letter-spacing: -1px;
}

/* ── Overlay transition ──────────────────────────────────────────────────── */
.overlay-fade-enter-active,
.overlay-fade-leave-active { transition: opacity .25s ease; }
.overlay-fade-enter-from,
.overlay-fade-leave-to     { opacity: 0; }
</style>
