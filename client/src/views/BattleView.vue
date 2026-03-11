<template>
  <div class="battle-page" v-if="battleState">

    <!-- ── Enemy zone (top) ──────────────────────────────────────────────── -->
    <section class="battle-zone battle-zone--enemy">
      <div class="player-bar">
        <span class="player-name">{{ enemyId ?? '—' }}</span>
        <span class="player-hp">❤ {{ enemyPlayer?.hp ?? 0 }}</span>
        <span class="grave-badge">⚰ {{ enemyPlayer?.graveyard.length ?? 0 }}</span>
      </div>

      <!-- Enemy hand: face-down card backs -->
      <div class="enemy-hand">
        <div
          v-for="i in (enemyPlayer?.hand.length ?? 0)"
          :key="i"
          class="card-back"
        >
          <span class="card-back__icon">⚔</span>
        </div>
        <span v-if="!enemyPlayer?.hand.length" class="hand-empty">—</span>
      </div>

      <!-- enemy field: pushed to bottom of zone via margin-top:auto -->
      <div class="field field--enemy">
        <template v-for="(card, idx) in enemyPlayer?.field ?? []" :key="card?.instanceId ?? `e-slot-${idx}`">
          <CardComponent v-if="card !== null" :card="card" />
          <div v-else class="field-placeholder" />
        </template>
        <div v-if="enemyFieldEmpty" class="empty-field">— empty —</div>
      </div>
    </section>

    <!-- ── Divider / turn info ───────────────────────────────────────────── -->
    <div class="battle-divider">
      <span class="phase-badge">Turn {{ battleState.turn }} · {{ battleState.phase.toUpperCase() }}</span>
      <span class="active-badge">Active: {{ battleState.activePlayerId }}</span>
      <Transition name="fade">
        <span v-if="battleState.isOver" class="winner-banner">
          🏆 {{ battleState.winner }} wins!
        </span>
      </Transition>
    </div>

    <!-- ── My zone (bottom) ─────────────────────────────────────────────── -->
    <section class="battle-zone battle-zone--me">
      <!-- my field: sits at the top of zone, right below the divider -->
      <div class="field field--me">
        <template v-for="(card, idx) in myPlayer?.field ?? []" :key="card?.instanceId ?? `m-slot-${idx}`">
          <CardComponent v-if="card !== null" :card="card" />
          <div v-else class="field-placeholder" />
        </template>
        <div v-if="myFieldEmpty" class="empty-field">— empty —</div>
      </div>

      <div class="player-bar player-bar--me">
        <div class="player-bar__info">
          <span class="player-name">{{ myPlayerId ?? '—' }}</span>
          <span class="player-hp">❤ {{ myPlayer?.hp ?? 0 }}</span>
          <span class="grave-badge">⚰ {{ myPlayer?.graveyard.length ?? 0 }}</span>
        </div>

        <!-- Hand cards (visible for me only) -->
        <div class="hand-area">
          <CardComponent
            v-for="card in myPlayer?.hand ?? []"
            :key="card.instanceId"
            :card="card"
            class="hand-card"
          />
          <span v-if="!myPlayer?.hand.length" class="hand-empty">No cards in hand</span>
        </div>
      </div>
    </section>

    <!-- ── Battle Log (right panel) ─────────────────────────────────────── -->
    <aside class="battle-log">
      <h3 class="log-title">Battle Log</h3>
      <ul class="log-list">
        <TransitionGroup name="log-slide">
          <li
            v-for="(entry, i) in recentLogs"
            :key="entry.turn + '-' + i"
            class="log-entry"
            :class="logClass(entry)"
          >
            <span class="log-turn">T{{ entry.turn }}</span>
            {{ entry.message.replace(/^\[.*?\]\s*/, '') }}
          </li>
        </TransitionGroup>
      </ul>
    </aside>

  </div>

  <!-- waiting state -->
  <div v-else class="waiting">
    <div class="spinner" />
    <p>Waiting for battle data…</p>
    <RouterLink to="/" class="back-link">← Back to menu</RouterLink>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { storeToRefs } from 'pinia';
import { RouterLink } from 'vue-router';
import { useBattleStore } from '../stores/battle';
import CardComponent from '../components/CardComponent.vue';
import type { BattleLogEntry } from '@auto-battle/shared';

const store = useBattleStore();
const { battleState, myPlayerId } = storeToRefs(store);

const myPlayer = computed(() =>
  battleState.value && myPlayerId.value
    ? battleState.value.players[myPlayerId.value]
    : null
);

const enemyId = computed(() =>
  battleState.value && myPlayerId.value
    ? Object.keys(battleState.value.players).find(id => id !== myPlayerId.value) ?? null
    : null
);

const enemyPlayer = computed(() =>
  battleState.value && enemyId.value
    ? battleState.value.players[enemyId.value]
    : null
);

// field 可能含 null，需過濾才算「是否有卡」
const myFieldEmpty    = computed(() => !(myPlayer.value?.field ?? []).some(f => f !== null));
const enemyFieldEmpty = computed(() => !(enemyPlayer.value?.field ?? []).some(f => f !== null));

// Latest 10 entries, newest first
const recentLogs = computed(() =>
  battleState.value ? [...battleState.value.log].slice(-10).reverse() : []
);

function logClass(entry: BattleLogEntry) {
  if (entry.effect === 'death')         return 'log--death';
  if (entry.effect === 'direct_damage') return 'log--direct';
  if (entry.effect === 'deploy')        return 'log--deploy';
  if (entry.effect === 'attack')        return 'log--attack';
  return '';
}
</script>

<style scoped>
/* ── Layout ──────────────────────────────────────────────────────────────── */
.battle-page {
  display: grid;
  grid-template-columns: 1fr 220px;
  grid-template-rows: 1fr 28px 1fr;
  grid-template-areas:
    "enemy   log"
    "divider log"
    "me      log";
  height: 100vh;
  background: #0d0d1a;
  color: #e2e8f0;
  overflow: hidden;
}

/* ── Zones ───────────────────────────────────────────────────────────────── */
.battle-zone {
  display: flex;
  flex-direction: column;
  padding: 10px 14px;
  gap: 8px;
}

.battle-zone--enemy {
  grid-area: enemy;
  background: #111827;
  /* push field to the bottom so it sits right above the divider */
  justify-content: space-between;
}

.battle-zone--me {
  grid-area: me;
  background: #0f172a;
  /* field at top (naturally), player-bar pushed to bottom */
  justify-content: space-between;
}

/* ── Player bar ──────────────────────────────────────────────────────────── */
.player-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 13px;
  flex-shrink: 0;
}

.player-bar--me {
  flex-direction: column;
  align-items: flex-start;
  gap: 6px;
}

.player-bar__info {
  display: flex;
  align-items: center;
  gap: 10px;
}

.player-name { font-weight: 700; font-size: 14px; color: #f1f5f9; }
.player-hp   { color: #f87171; font-weight: 600; }
.hand-badge  { background: #1e3a5f; border-radius: 4px; padding: 1px 6px; font-size: 11px; }
.grave-badge { color: #94a3b8; font-size: 11px; }

/* ── Fields ──────────────────────────────────────────────────────────────── */
.field {
  display: flex;
  flex-direction: row;
  justify-content: flex-start; /* index 0 always on the left for both sides */
  align-items: center;
  gap: 8px;
  flex-wrap: nowrap;
  min-height: 108px;
  padding: 6px 8px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 6px;
  border: 1px dashed #1f2937;
  overflow-x: auto;
  flex-shrink: 0;
}

/* Placeholder keeps the column width so cards don't jump before left-shift */
.field-placeholder {
  min-width: 110px;
  max-width: 130px;
  min-height: 90px;
  border-radius: 8px;
  border: 1px dashed #1f2937;
  opacity: 0.25;
  flex-shrink: 0;
}

.empty-field {
  color: #374151;
  font-size: 12px;
  margin: auto;
}

/* ── Hand area ───────────────────────────────────────────────────────────── */
.hand-area {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.hand-card  { opacity: .8; transform: scale(.88); transform-origin: bottom center; }
.hand-empty { font-size: 11px; color: #4b5563; }

/* ── Enemy hand (card backs) ─────────────────────────────────────────────── */
.enemy-hand {
  display: flex;
  gap: 5px;
  align-items: center;
  flex-shrink: 0;
}

.card-back {
  position: relative;
  min-width: 46px;
  width: 46px;
  height: 64px;
  border-radius: 6px;
  background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
  border: 1px solid #334155;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 6px rgba(0,0,0,.4);
  overflow: hidden;
}

/* subtle cross-hatch pattern */
.card-back::before {
  content: '';
  position: absolute;
  inset: 3px;
  border: 1px solid rgba(148, 163, 184, .12);
  border-radius: 3px;
}

.card-back__icon {
  font-size: 18px;
  opacity: .15;
  color: #94a3b8;
}

/* ── Divider ─────────────────────────────────────────────────────────────── */
.battle-divider {
  grid-area: divider;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 14px;
  background: #0d0d1a;
  border-top: 1px solid #1f2937;
  border-bottom: 1px solid #1f2937;
  padding: 0 14px;
  font-size: 11px;
}

.phase-badge  { background: #1e3a5f; border-radius: 4px; padding: 1px 7px; color: #93c5fd; }
.active-badge { color: #6b7280; }
.winner-banner {
  font-size: .9rem;
  font-weight: 700;
  color: #fbbf24;
  background: rgba(0,0,0,.5);
  border-radius: 6px;
  padding: 2px 12px;
}

/* ── Battle Log ──────────────────────────────────────────────────────────── */
.battle-log {
  grid-area: log;
  display: flex;
  flex-direction: column;
  background: #111827;
  border-left: 1px solid #1f2937;
  overflow: hidden;
}

.log-title {
  font-size: 11px;
  font-weight: 700;
  color: #4b5563;
  text-transform: uppercase;
  letter-spacing: 1px;
  padding: 8px 12px 6px;
  margin: 0;
  border-bottom: 1px solid #1f2937;
}

.log-list {
  list-style: none;
  margin: 0;
  padding: 4px 0;
  overflow-y: auto;
  flex: 1;
  font-size: 11px;
  line-height: 1.5;
}

.log-entry {
  padding: 3px 12px;
  border-left: 2px solid transparent;
  color: #6b7280;
}

.log--attack { border-color: #ef4444; color: #fca5a5; }
.log--direct { border-color: #f97316; color: #fed7aa; }
.log--deploy { border-color: #22c55e; color: #bbf7d0; }
.log--death  { border-color: #374151; color: #6b7280; font-style: italic; }

.log-turn { font-size: 9px; color: #374151; margin-right: 4px; }

/* ── Transitions ─────────────────────────────────────────────────────────── */
.card-slide-enter-active,
.card-slide-leave-active { transition: all .35s ease; }
.card-slide-enter-from   { opacity: 0; transform: translateY(-16px) scale(.9); }
.card-slide-leave-to     { opacity: 0; transform: translateY(16px)  scale(.9); }

.log-slide-enter-active { transition: all .25s ease; }
.log-slide-enter-from   { opacity: 0; transform: translateX(16px); }

.fade-enter-active, .fade-leave-active { transition: opacity .4s; }
.fade-enter-from, .fade-leave-to       { opacity: 0; }

/* ── Waiting screen ──────────────────────────────────────────────────────── */
.waiting {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: #0d0d1a;
  color: #94a3b8;
  gap: 12px;
}

.spinner {
  width: 36px; height: 36px;
  border: 3px solid #1e3a5f;
  border-top-color: #3b82f6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin { to { transform: rotate(360deg); } }

.back-link { color: #60a5fa; font-size: 13px; }
</style>
