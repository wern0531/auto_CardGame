<template>
  <div class="deck-builder">

    <!-- ── 左：卡片庫 ──────────────────────────────────────────────── -->
    <section class="collection-panel">

      <div class="panel-header">
        <h2 class="panel-title">卡片庫</h2>
        <RouterLink to="/" class="back-link">← 返回首頁</RouterLink>
      </div>

      <!-- 分類頁籤 -->
      <div class="tabs">
        <button
          v-for="tab in TABS"
          :key="tab.type"
          class="tab-btn"
          :class="{ 'tab-btn--active': activeTab === tab.type }"
          @click="activeTab = tab.type"
        >{{ tab.label }}</button>
      </div>

      <!-- 卡片格 -->
      <div class="card-grid">
        <div
          v-for="tpl in filteredCollection"
          :key="tpl.cardId"
          class="card-slot"
          :class="{ 'card-slot--maxed': isMaxed(tpl) }"
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

    <!-- ── 右：當前牌組 ────────────────────────────────────────────── -->
    <section class="deck-panel">
      <h2 class="panel-title">當前牌組</h2>

      <!-- 主將預覽 -->
      <div class="hero-area">
        <template v-if="playerStore.heroTemplate">
          <CardComponent :card="toPreview(playerStore.heroTemplate)" class="hero-preview" />
          <div class="hero-info">
            <span class="hero-name">{{ playerStore.heroTemplate.name }}</span>
            <span
              class="deck-count"
              :class="{ 'deck-count--full': playerStore.currentDeck.cardIds.length >= playerStore.deckLimit }"
            >
              {{ playerStore.currentDeck.cardIds.length }} / {{ playerStore.deckLimit }} 張
            </span>
            <span class="deck-hint">點擊牌組中的卡牌可移除</span>
          </div>
        </template>
        <div v-else class="hero-empty">← 在左側「主將」頁籤選擇主將</div>
      </div>

      <!-- 牌組清單 -->
      <ul class="deck-list">
        <TransitionGroup name="deck-slide">
          <li
            v-for="(cardId, idx) in playerStore.currentDeck.cardIds"
            :key="`${cardId}-${idx}`"
            class="deck-entry"
            @click="playerStore.removeCardFromDeck(idx)"
            title="點擊移除"
          >
            <span class="deck-entry__type" :class="`type--${typeOf(cardId)}`">
              {{ typeLabelOf(cardId) }}
            </span>
            <span class="deck-entry__name">{{ nameOf(cardId) }}</span>
            <span class="deck-entry__remove">✕</span>
          </li>
        </TransitionGroup>
        <li v-if="!playerStore.currentDeck.cardIds.length" class="deck-entry--empty">
          尚未加入任何卡片
        </li>
      </ul>

      <!-- 錯誤提示 -->
      <Transition name="fade">
        <p v-if="errorMsg" class="error-msg">⚠ {{ errorMsg }}</p>
      </Transition>

      <!-- 操作按鈕 -->
      <div class="deck-actions">
        <button class="btn-clear" @click="clearDeck" :disabled="!hasDeckContent">
          清空牌組
        </button>
        <button
          class="btn-fight"
          :disabled="!playerStore.isDeckValid() || loading"
          @click="startBattle"
        >
          {{ loading ? '連線中…' : '儲存並前往戰鬥' }}
        </button>
      </div>

    </section>

  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { RouterLink } from 'vue-router';
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

/**
 * Convert a CardTemplate to a fake CardInstance for CardComponent preview.
 * Uses 'deck' zone so no cooldown overlay or ready-glow appears.
 */
function toPreview(tpl: CardTemplate): CardInstance {
  let hp = 0, maxHp = 0, attack = 0, cooldown = 0;

  if (tpl.type === 'hero' || tpl.type === 'creature') {
    hp = tpl.baseStats.hp; maxHp = tpl.baseStats.hp;
    attack = tpl.baseStats.attack; cooldown = tpl.baseStats.cooldown;
  } else if (tpl.type === 'artifact') {
    hp = tpl.baseStats.hpBonus; maxHp = Math.max(tpl.baseStats.hpBonus, 1);
    attack = tpl.baseStats.attackBonus; cooldown = tpl.baseStats.cooldown;
  } else {
    // spell
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
  if (tpl.type === 'hero') return false; // hero selection is always available
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
    // Auto-switch to creature tab after picking hero
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
/* ── Layout ──────────────────────────────────────────────────────────────── */
.deck-builder {
  display: flex;
  height: 100vh;
  background: #0d0d1a;
  color: #e2e8f0;
  overflow: hidden;
}

/* ── Left panel ──────────────────────────────────────────────────────────── */
.collection-panel {
  flex: 3;
  display: flex;
  flex-direction: column;
  border-right: 1px solid #1f2937;
  overflow: hidden;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 18px 4px;
  flex-shrink: 0;
}

.panel-title {
  font-size: 12px;
  font-weight: 700;
  color: #4b5563;
  text-transform: uppercase;
  letter-spacing: 1.5px;
  margin: 0;
}

.back-link {
  font-size: 11px;
  color: #60a5fa;
  text-decoration: none;
}
.back-link:hover { text-decoration: underline; }

/* ── Tabs ────────────────────────────────────────────────────────────────── */
.tabs {
  display: flex;
  gap: 6px;
  padding: 10px 18px;
  flex-shrink: 0;
  border-bottom: 1px solid #1f2937;
}

.tab-btn {
  padding: 5px 16px;
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

/* ── Card grid ───────────────────────────────────────────────────────────── */
.card-grid {
  flex: 1;
  overflow-y: auto;
  padding: 14px 18px;
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
  align-content: flex-start;
}

.card-slot {
  position: relative;
  cursor: pointer;
  transition: transform 0.15s, opacity 0.15s;
}
.card-slot:hover { transform: translateY(-5px); }
.card-slot--maxed { opacity: 0.35; cursor: not-allowed; }
.card-slot--maxed:hover { transform: none; }

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
  margin: auto;
}

/* ── Right panel ─────────────────────────────────────────────────────────── */
.deck-panel {
  flex: 2;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 14px 16px;
  background: #0f172a;
  overflow: hidden;
}

/* ── Hero area ───────────────────────────────────────────────────────────── */
.hero-area {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px;
  background: rgba(255,255,255,0.03);
  border-radius: 10px;
  border: 1px dashed #1f2937;
  min-height: 90px;
  flex-shrink: 0;
}

.hero-preview {
  flex-shrink: 0;
  transform: scale(0.82);
  transform-origin: left center;
}

.hero-info {
  display: flex;
  flex-direction: column;
  gap: 5px;
}
.hero-name  { font-size: 14px; font-weight: 700; color: #f1f5f9; }
.deck-count { font-size: 13px; color: #6b7280; font-weight: 600; }
.deck-count--full { color: #f87171; }
.deck-hint  { font-size: 10px; color: #374151; }

.hero-empty {
  color: #374151;
  font-size: 12px;
  margin: auto;
  text-align: center;
  line-height: 1.8;
}

/* ── Deck list ───────────────────────────────────────────────────────────── */
.deck-list {
  flex: 1;
  list-style: none;
  margin: 0;
  padding: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.deck-entry {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  border-radius: 6px;
  background: rgba(255,255,255,0.04);
  cursor: pointer;
  transition: background 0.12s;
  font-size: 12px;
}
.deck-entry:hover { background: rgba(239,68,68,0.14); }
.deck-entry:hover .deck-entry__remove { opacity: 1; }

.deck-entry__type {
  font-size: 9px;
  padding: 1px 5px;
  border-radius: 4px;
  background: rgba(255,255,255,0.08);
  white-space: nowrap;
  flex-shrink: 0;
}
.type--hero     { color: #c4b5fd; }
.type--creature { color: #93c5fd; }
.type--artifact { color: #fde68a; }
.type--spell    { color: #6ee7b7; }

.deck-entry__name   { flex: 1; color: #d1d5db; }
.deck-entry__remove { opacity: 0; color: #f87171; font-size: 10px; transition: opacity 0.12s; }

.deck-entry--empty {
  list-style: none;
  color: #374151;
  font-size: 11px;
  padding: 12px;
  text-align: center;
}

/* ── Error / Actions ─────────────────────────────────────────────────────── */
.error-msg {
  color: #fca5a5;
  font-size: 11px;
  margin: 0;
  padding: 0 2px;
  flex-shrink: 0;
}

.deck-actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

.btn-clear {
  padding: 10px 14px;
  border: 1px solid #1f2937;
  border-radius: 8px;
  background: transparent;
  color: #6b7280;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.15s;
  white-space: nowrap;
}
.btn-clear:hover:not(:disabled) { border-color: #ef4444; color: #f87171; }
.btn-clear:disabled { opacity: 0.3; cursor: not-allowed; }

.btn-fight {
  flex: 1;
  padding: 12px;
  background: linear-gradient(135deg, #1e3a5f, #2563eb);
  border: none;
  border-radius: 8px;
  color: #fff;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition: opacity 0.15s, transform 0.15s;
}
.btn-fight:hover:not(:disabled) { opacity: 0.9; transform: translateY(-1px); }
.btn-fight:disabled { opacity: 0.35; cursor: not-allowed; }

/* ── Transitions ─────────────────────────────────────────────────────────── */
.deck-slide-enter-active,
.deck-slide-leave-active { transition: all 0.2s ease; }
.deck-slide-enter-from   { opacity: 0; transform: translateX(12px); }
.deck-slide-leave-to     { opacity: 0; transform: translateX(-12px); height: 0; padding: 0; margin: 0; }

.fade-enter-active, .fade-leave-active { transition: opacity 0.25s; }
.fade-enter-from, .fade-leave-to       { opacity: 0; }
</style>
