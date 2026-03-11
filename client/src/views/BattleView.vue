<template>
  <div class="battle-page" v-if="battleState">

    <!-- ── Enemy zone (top) ──────────────────────────────────────────────── -->
    <section class="battle-zone battle-zone--enemy">
      <div class="player-bar">
        <span class="player-name">{{ enemyId ?? '—' }}</span>
        <span class="player-hp">❤ {{ enemyPlayer?.hp ?? 0 }}</span>
        <span class="hand-badge">Hand: {{ enemyPlayer?.hand.length ?? 0 }}</span>
        <span class="grave-badge">⚰ {{ enemyPlayer?.graveyard.length ?? 0 }}</span>
      </div>

      <div class="field field--enemy">
        <TransitionGroup name="card-slide">
          <CardComponent
            v-for="card in enemyPlayer?.field ?? []"
            :key="card.instanceId"
            :card="card"
          />
        </TransitionGroup>
        <div v-if="!enemyPlayer?.field.length" class="empty-field">— empty —</div>
      </div>
    </section>

    <!-- ── Divider / turn info ───────────────────────────────────────────── -->
    <div class="battle-divider">
      <span class="phase-badge">Turn {{ battleState.turn }}  ·  {{ battleState.phase.toUpperCase() }}</span>
      <span class="active-badge">Active: {{ battleState.activePlayerId }}</span>
      <Transition name="fade">
        <span v-if="battleState.isOver" class="winner-banner">
          🏆 {{ battleState.winner }} wins!
        </span>
      </Transition>
    </div>

    <!-- ── My zone (bottom) ─────────────────────────────────────────────── -->
    <section class="battle-zone battle-zone--me">
      <div class="field field--me">
        <TransitionGroup name="card-slide">
          <CardComponent
            v-for="card in myPlayer?.field ?? []"
            :key="card.instanceId"
            :card="card"
          />
        </TransitionGroup>
        <div v-if="!myPlayer?.field.length" class="empty-field">— empty —</div>
      </div>

      <div class="player-bar player-bar--me">
        <span class="player-name">{{ myPlayerId ?? '—' }}</span>
        <span class="player-hp">❤ {{ myPlayer?.hp ?? 0 }}</span>
        <span class="grave-badge">⚰ {{ myPlayer?.graveyard.length ?? 0 }}</span>

        <!-- Hand cards (visible for me) -->
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
  grid-template-rows: 1fr 44px 1fr;
  grid-template-areas:
    "enemy  log"
    "divider log"
    "me     log";
  height: 100vh;
  background: #0d0d1a;
  color: #e2e8f0;
  overflow: hidden;
}

.battle-zone       { display: flex; flex-direction: column; padding: 12px 16px; gap: 10px; }
.battle-zone--enemy { grid-area: enemy;   background: #111827; border-bottom: 1px solid #1f2937; }
.battle-zone--me    { grid-area: me;      background: #0f172a; }

/* ── Player bar ──────────────────────────────────────────────────────────── */
.player-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 13px;
}

.player-bar--me { flex-direction: column; align-items: flex-start; }

.player-name { font-weight: 700; font-size: 14px; color: #f1f5f9; }
.player-hp   { color: #f87171; font-weight: 600; }
.hand-badge  { background: #1e3a5f; border-radius: 4px; padding: 1px 6px; font-size: 11px; }
.grave-badge { color: #94a3b8; font-size: 11px; }

/* ── Field ───────────────────────────────────────────────────────────────── */
.field {
  display: flex;
  flex-direction: row;
  gap: 10px;
  flex-wrap: nowrap;
  align-items: center;
  min-height: 100px;
  padding: 8px;
  background: rgba(255,255,255,.03);
  border-radius: 8px;
  border: 1px dashed #1f2937;
  overflow-x: auto;
}

.field--enemy { flex-direction: row-reverse; } /* enemy reads right-to-left visually */

.empty-field {
  color: #4b5563;
  font-size: 12px;
  margin: auto;
}

/* ── Hand area ───────────────────────────────────────────────────────────── */
.hand-area {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  padding: 4px 0;
}

.hand-card { opacity: .85; transform: scale(.9); }
.hand-empty { font-size: 11px; color: #4b5563; }

/* ── Divider ─────────────────────────────────────────────────────────────── */
.battle-divider {
  grid-area: divider;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 20px;
  background: #1e293b;
  border-top: 1px solid #334155;
  border-bottom: 1px solid #334155;
  padding: 0 16px;
  font-size: 12px;
}

.phase-badge  { background: #1e3a5f; border-radius: 4px; padding: 2px 8px; color: #93c5fd; }
.active-badge { color: #94a3b8; }
.winner-banner {
  font-size: 1rem;
  font-weight: 700;
  color: #fbbf24;
  background: rgba(0,0,0,.4);
  border-radius: 6px;
  padding: 4px 14px;
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
  font-size: 12px;
  font-weight: 700;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 1px;
  padding: 10px 12px 6px;
  margin: 0;
  border-bottom: 1px solid #1f2937;
}

.log-list {
  list-style: none;
  margin: 0;
  padding: 6px 0;
  overflow-y: auto;
  flex: 1;
  font-size: 11px;
  line-height: 1.5;
}

.log-entry {
  padding: 3px 12px;
  border-left: 2px solid transparent;
  color: #94a3b8;
}
.log--attack { border-color: #ef4444; color: #fca5a5; }
.log--direct { border-color: #f97316; color: #fed7aa; }
.log--deploy { border-color: #22c55e; color: #bbf7d0; }
.log--death  { border-color: #6b7280; color: #9ca3af; }

.log-turn {
  font-size: 9px;
  color: #4b5563;
  margin-right: 4px;
}

/* ── Transitions ─────────────────────────────────────────────────────────── */
.card-slide-enter-active,
.card-slide-leave-active { transition: all .4s ease; }
.card-slide-enter-from   { opacity: 0; transform: translateY(-20px); }
.card-slide-leave-to     { opacity: 0; transform: translateY(20px); }

.log-slide-enter-active { transition: all .3s ease; }
.log-slide-enter-from   { opacity: 0; transform: translateX(20px); }

.fade-enter-active, .fade-leave-active { transition: opacity .5s; }
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
