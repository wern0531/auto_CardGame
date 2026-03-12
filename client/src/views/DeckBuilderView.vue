<template>
  <div class="deck-builder">

    <!-- ── 上：當前部隊 ─────────────────────────────────────────────── -->
    <section class="squad-section">
      <div class="squad-header">
        <span class="squad-label">Current Squad 當前部隊</span>
        <span
          class="deck-count"
          :class="{ 'deck-count--full': playerStore.currentDeck.cardIds.length >= playerStore.deckLimit }"
        >
          {{ playerStore.currentDeck.cardIds.length }} / {{ playerStore.deckLimit }}
        </span>
      </div>

      <div class="squad-slots">
        <!-- 主將槽 -->
        <div class="hero-slot" :class="{ 'hero-slot--filled': !!playerStore.heroTemplate }">
          <template v-if="playerStore.heroTemplate">
            <div class="slot-card hero-card-preview">
              <CardComponent :card="toPreview(playerStore.heroTemplate)" />
            </div>
          </template>
          <div v-else class="slot-empty">
            <span class="slot-empty__icon">👑</span>
            <span class="slot-empty__text">選主將</span>
          </div>
        </div>

        <div class="squad-divider"></div>

        <!-- 卡片槽 -->
        <TransitionGroup name="slot-anim" tag="div" class="card-slots">
          <div
            v-for="(cardId, idx) in playerStore.currentDeck.cardIds"
            :key="`${cardId}-${idx}`"
            class="card-slot-item"
            :class="`type-bg--${typeOf(cardId)}`"
            :title="`點擊移除：${nameOf(cardId)}`"
            @click="playerStore.removeCardFromDeck(idx)"
          >
            <span class="slot-type-badge" :class="`type--${typeOf(cardId)}`">{{ typeLabelOf(cardId) }}</span>
            <span class="slot-name">{{ nameOf(cardId) }}</span>
            <span class="slot-remove">✕</span>
          </div>
        </TransitionGroup>

        <div v-if="!playerStore.currentDeck.cardIds.length" class="slots-empty">
          從下方卡片庫加入卡片
        </div>
      </div>

      <!-- 操作按鈕 & 錯誤訊息 -->
      <div class="squad-actions">
        <Transition name="fade">
          <span v-if="errorMsg" class="error-msg">⚠ {{ errorMsg }}</span>
        </Transition>
        <button class="btn-clear" @click="clearDeck" :disabled="!hasDeckContent">清空</button>
        <button
          class="btn-fight"
          :disabled="!playerStore.isDeckValid() || loading"
          @click="startBattle"
        >
          {{ loading ? '連線中…' : '儲存並開戰 ▶' }}
        </button>
      </div>
    </section>

    <!-- ── 下：卡片庫 ────────────────────────────────────────────────── -->
    <section class="collection-section">
      <!-- 分類頁籤 -->
      <div class="tabs">
        <button
          v-for="tab in TABS"
          :key="tab.type"
          class="tab-btn"
          :class="{ 'tab-btn--active': activeTab === tab.type }"
          @click="activeTab = tab.type"
        >{{ tab.label }}</button>
        <span class="collection-label">Collection 卡片庫</span>
      </div>

      <!-- 卡片格 (CSS Grid) -->
      <div class="card-grid">
        <div
          v-for="tpl in filteredCollection"
          :key="tpl.cardId"
          class="card-grid-slot"
          :class="{ 'card-grid-slot--maxed': isMaxed(tpl) }"
          :title="slotHint(tpl)"
          @click="onClickCard(tpl)"
        >
          <CardComponent :card="toPreview(tpl)" />
          <div v-if="copyCount(tpl.cardId) > 0" class="copy-badge">
            {{ copyCount(tpl.cardId) >= MAX_COPIES ? `×${MAX_COPIES}滿` : `×${copyCount(tpl.cardId)}` }}
          </div>
        </div>
        <div v-if="filteredCollection.length === 0" class="grid-empty">暫無卡片</div>
      </div>
    </section>

  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { usePlayerStore } from '../stores/player';
import { useBattleStore } from '../stores/battle';
import CardComponent from '../components/CardComponent.vue';
import type { CardTemplate, CardInstance } from '@auto-battle/shared';

const playerStore = usePlayerStore();
const battleStore = useBattleStore();

// ── Constants ───────────────────────────────────────────────────────────────

const MAX_COPIES = 2;

const TABS = [
  { type: 'hero'     as const, label: '主將' },
  { type: 'creature' as const, label: '生物' },
  { type: 'spell'    as const, label: '法術' },
  { type: 'artifact' as const, label: '裝備' },
];

const TYPE_LABELS: Record<string, string> = {
  hero: '主將', creature: '生物', artifact: '裝備', spell: '法術',
};

// ── State ───────────────────────────────────────────────────────────────────

const activeTab = ref<'hero' | 'creature' | 'spell' | 'artifact'>('hero');
const errorMsg  = ref('');
const loading   = ref(false);

// ── Computed ────────────────────────────────────────────────────────────────

const filteredCollection = computed(() =>
  playerStore.collection.filter(t => t.type === activeTab.value),
);

const hasDeckContent = computed(() =>
  !!playerStore.currentDeck.heroCardId || playerStore.currentDeck.cardIds.length > 0,
);

// ── Helpers ─────────────────────────────────────────────────────────────────

function toPreview(tpl: CardTemplate): CardInstance {
  let hp = 0, maxHp = 0, attack = 0, cooldown = 0;

  if (tpl.type === 'hero' || tpl.type === 'creature') {
    hp = tpl.baseStats.hp; maxHp = tpl.baseStats.hp;
    attack = tpl.baseStats.attack; cooldown = tpl.baseStats.cooldown;
  } else if (tpl.type === 'artifact') {
    hp = tpl.baseStats.hpBonus; maxHp = Math.max(tpl.baseStats.hpBonus, 1);
    attack = tpl.baseStats.attackBonus; cooldown = tpl.baseStats.cooldown;
  } else {
    maxHp = 1; cooldown = tpl.cooldown;
  }

  return {
    instanceId:     `preview-${tpl.cardId}`,
    cardId:         tpl.cardId,
    ownerId:        'preview',
    type:           tpl.type,
    currentZone:    'deck' as const,
    position:       0,
    currentStats:   { hp, maxHp, attack, cooldown },
    activeStatuses: [],
  };
}

function copyCount(cardId: string): number {
  return playerStore.currentDeck.cardIds.filter(id => id === cardId).length;
}

function isMaxed(tpl: CardTemplate): boolean {
  if (tpl.type === 'hero') return false;
  return copyCount(tpl.cardId) >= MAX_COPIES;
}

function slotHint(tpl: CardTemplate): string {
  if (tpl.type === 'hero') return `選擇「${tpl.name}」為主將`;
  if (isMaxed(tpl)) return `已達上限（${MAX_COPIES} 張）`;
  return `加入「${tpl.name}」`;
}

function nameOf(cardId: string): string {
  return playerStore.collection.find(t => t.cardId === cardId)?.name ?? cardId;
}

function typeOf(cardId: string): string {
  return playerStore.collection.find(t => t.cardId === cardId)?.type ?? '';
}

function typeLabelOf(cardId: string): string {
  return TYPE_LABELS[typeOf(cardId)] ?? '';
}

// ── Actions ─────────────────────────────────────────────────────────────────

function onClickCard(tpl: CardTemplate) {
  errorMsg.value = '';
  if (tpl.type === 'hero') {
    playerStore.setHero(tpl.cardId);
    activeTab.value = 'creature';
  } else {
    const result = playerStore.addCardToDeck(tpl.cardId);
    if (!result.ok) errorMsg.value = result.reason ?? '無法加入';
  }
}

function clearDeck() {
  playerStore.setHero('');
  playerStore.currentDeck.cardIds = [];
}

function startBattle() {
  if (!playerStore.isDeckValid()) {
    errorMsg.value = '牌組不完整，請選擇主將並加入至少 1 張卡片';
    return;
  }
  errorMsg.value = '';
  loading.value  = true;
  battleStore.startCampaign(playerStore.currentDeck);
}
</script>

<style scoped>
/* ── Root ────────────────────────────────────────────────────────────────── */
.deck-builder {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #0d0d1a;
  color: #e2e8f0;
  overflow: hidden;
}

/* ── Upper: Squad ────────────────────────────────────────────────────────── */
.squad-section {
  flex-shrink: 0;
  background: #0a0f1e;
  border-bottom: 2px solid #b8922a;
  box-shadow: 0 2px 12px rgba(184,146,42,0.2);
  padding: 10px 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.squad-header {
  display: flex;
  align-items: center;
  gap: 10px;
}

.squad-label {
  font-size: 11px;
  font-weight: 700;
  color: #b8922a;
  text-transform: uppercase;
  letter-spacing: 1.5px;
}

.deck-count {
  font-size: 11px;
  color: #6b7280;
  font-weight: 600;
}
.deck-count--full { color: #f87171; }

/* Hero slot */
.squad-slots {
  display: flex;
  align-items: center;
  gap: 10px;
  overflow-x: auto;
  padding-bottom: 4px;
}

.hero-slot {
  flex-shrink: 0;
  width: 76px;
  height: 76px;
  border: 2px solid #b8922a;
  border-radius: 8px;
  background: rgba(184,146,42,0.08);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  position: relative;
}

.hero-slot--filled {
  border-color: #f59e0b;
  box-shadow: 0 0 10px rgba(245,158,11,0.3);
}

.slot-card {
  transform: scale(0.62);
  transform-origin: center center;
  pointer-events: none;
}

.slot-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
}
.slot-empty__icon { font-size: 1.4rem; }
.slot-empty__text { font-size: 9px; color: #92400e; }

.squad-divider {
  width: 1px;
  height: 60px;
  background: #334155;
  flex-shrink: 0;
}

/* Card slots */
.card-slots {
  display: flex;
  gap: 6px;
  flex-wrap: nowrap;
}

.card-slot-item {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 5px 8px;
  border-radius: 6px;
  border: 1px solid #334155;
  background: rgba(255,255,255,0.04);
  cursor: pointer;
  font-size: 11px;
  white-space: nowrap;
  flex-shrink: 0;
  transition: background 0.12s;
}
.card-slot-item:hover { background: rgba(239,68,68,0.15); }
.card-slot-item:hover .slot-remove { opacity: 1; }

.slot-type-badge {
  font-size: 9px;
  padding: 1px 4px;
  border-radius: 3px;
  background: rgba(255,255,255,0.08);
}
.type--hero     { color: #c4b5fd; }
.type--creature { color: #93c5fd; }
.type--artifact { color: #fde68a; }
.type--spell    { color: #6ee7b7; }

.slot-name   { color: #d1d5db; max-width: 80px; overflow: hidden; text-overflow: ellipsis; }
.slot-remove { opacity: 0; color: #f87171; font-size: 9px; transition: opacity 0.12s; }

.slots-empty {
  font-size: 11px;
  color: #374151;
  padding: 4px 8px;
}

/* Actions row */
.squad-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.error-msg {
  flex: 1;
  color: #fca5a5;
  font-size: 11px;
}

.btn-clear {
  padding: 7px 12px;
  border: 1px solid #1f2937;
  border-radius: 6px;
  background: transparent;
  color: #6b7280;
  font-size: 11px;
  cursor: pointer;
  transition: all 0.15s;
  white-space: nowrap;
}
.btn-clear:hover:not(:disabled) { border-color: #ef4444; color: #f87171; }
.btn-clear:disabled { opacity: 0.3; cursor: not-allowed; }

.btn-fight {
  padding: 8px 20px;
  background: linear-gradient(135deg, #1e3a5f, #2563eb);
  border: none;
  border-radius: 6px;
  color: #fff;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  transition: opacity 0.15s, transform 0.15s;
  white-space: nowrap;
}
.btn-fight:hover:not(:disabled) { opacity: 0.9; transform: translateY(-1px); }
.btn-fight:disabled { opacity: 0.35; cursor: not-allowed; }

/* ── Lower: Collection ───────────────────────────────────────────────────── */
.collection-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.tabs {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  flex-shrink: 0;
  border-bottom: 1px solid #1f2937;
}

.tab-btn {
  padding: 4px 14px;
  border: 1px solid #1f2937;
  border-radius: 20px;
  background: transparent;
  color: #6b7280;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.15s;
}
.tab-btn:hover { color: #e2e8f0; border-color: #374151; }
.tab-btn--active { background: #1e3a5f; color: #93c5fd; border-color: #2563eb; }

.collection-label {
  margin-left: auto;
  font-size: 10px;
  font-weight: 700;
  color: #374151;
  text-transform: uppercase;
  letter-spacing: 1px;
}

/* Card grid with CSS Grid */
.card-grid {
  flex: 1;
  overflow-y: auto;
  padding: 14px 16px;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(110px, 1fr));
  gap: 12px;
  align-content: flex-start;
}

.card-grid-slot {
  position: relative;
  cursor: pointer;
  transition: transform 0.15s, opacity 0.15s;
}
.card-grid-slot:hover { transform: translateY(-5px); }
.card-grid-slot--maxed { opacity: 0.35; cursor: not-allowed; }
.card-grid-slot--maxed:hover { transform: none; }

.copy-badge {
  position: absolute;
  top: -7px;
  right: -7px;
  background: #3b82f6;
  color: #fff;
  font-size: 9px;
  font-weight: 800;
  border-radius: 10px;
  padding: 2px 6px;
  pointer-events: none;
  box-shadow: 0 1px 4px rgba(0,0,0,.4);
}

.grid-empty {
  color: #374151;
  font-size: 12px;
  grid-column: 1/-1;
  text-align: center;
  padding: 24px;
}

/* ── Transitions ─────────────────────────────────────────────────────────── */
.slot-anim-enter-active,
.slot-anim-leave-active { transition: all 0.2s ease; }
.slot-anim-enter-from   { opacity: 0; transform: translateX(10px); }
.slot-anim-leave-to     { opacity: 0; transform: translateX(-10px); }

.fade-enter-active, .fade-leave-active { transition: opacity 0.25s; }
.fade-enter-from, .fade-leave-to       { opacity: 0; }
</style>
