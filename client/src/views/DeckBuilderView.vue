<template>
  <div class="deck-builder">

    <!-- ═══════════════════════════ LEFT PANE ═══════════════════════════════ -->
    <div class="left-pane">

      <!-- ── 上半截 (80%) ─────────────────────────────────────────────────── -->
      <div class="top-half">

        <!-- A 區：左側 70% — 牌組清單，3 欄固定高 100px，獨立滾動 -->
        <div class="area-a-squads">
          <div
            v-for="(squad, idx) in playerStore.squads"
            :key="idx"
            class="squad-thumb"
            :class="{
              'squad-thumb--active':    playerStore.activeSquadIndex === idx,
              'squad-thumb--has-image': !!heroImageOf(squad.heroCardId),
            }"
            :style="heroImageOf(squad.heroCardId)
              ? { backgroundImage: `url('${heroImageOf(squad.heroCardId)}')`, backgroundSize: 'cover', backgroundPosition: 'center' }
              : {}"
            :title="`Squad ${idx + 1}`"
            @click="playerStore.selectSquad(idx)"
          >
            <!-- 有圖片：只顯示編號，其餘由遮罩覆蓋 -->
            <template v-if="heroImageOf(squad.heroCardId)">
              <div class="squad-thumb-img-mask" />
              <span class="squad-thumb-num squad-thumb-num--over-img">#{{ idx + 1 }}</span>
            </template>
            <!-- 無圖片：原本樣式 -->
            <template v-else>
              <span class="squad-thumb-icon">{{ heroIconOf(squad.heroCardId) }}</span>
              <span class="squad-thumb-hero">{{ heroNameOf(squad.heroCardId) }}</span>
              <span class="squad-thumb-num">#{{ idx + 1 }}</span>
            </template>
          </div>

          <!-- 草稿框：僅在新增狀態（未儲存）時顯示 -->
          <div
            v-if="playerStore.activeSquadIndex === -1"
            class="squad-thumb squad-thumb--draft squad-thumb--active"
            title="新牌組（草稿）"
          >
            <span class="squad-thumb-icon">✏</span>
            <span class="squad-thumb-hero">草稿</span>
            <span class="squad-thumb-num">New</span>
          </div>

          <!-- + 號：只在已選中某個已儲存牌組時顯示 -->
          <div
            v-if="playerStore.activeSquadIndex !== -1"
            class="add-squad-btn"
            title="New Squad"
            @click="playerStore.createNewSquad()"
          >
            <span class="add-squad-plus">＋</span>
            <span class="add-squad-label">New Squad</span>
          </div>
        </div>

        <!-- B 區：右側 30% — 英雄卡 + 操作按鈕 -->
        <div class="area-b-hero">
          <template v-if="playerStore.draftSquad !== null">

            <!-- 英雄卡圖 -->
            <div v-if="playerStore.heroTemplate" class="b-hero-card-frame">
              <CardComponent :card="toPreview(playerStore.heroTemplate)" />
            </div>
            <div v-else class="b-empty-hero">
              <span class="b-empty-icon">👑</span>
              <p>請選擇主將</p>
              <p class="b-empty-hint">從右側點擊英雄卡</p>
            </div>

            <!-- 配額資訊 (有英雄時才顯示) -->
            <div v-if="playerStore.heroTemplate" class="b-hero-meta">
              <div class="b-hero-name-row">
                <span class="faction-badge" :class="`faction--${playerStore.heroTemplate.faction}`">
                  {{ playerStore.heroTemplate.faction.toUpperCase() }}
                </span>
                <span class="b-hero-name">{{ playerStore.heroTemplate.name }}</span>
              </div>
              <div class="quota-row">
                <span class="quota-tag quota--creature">⚔ {{ playerStore.heroTemplate.squadSlots.creature }}</span>
                <span class="quota-tag quota--artifact">🛡 {{ playerStore.heroTemplate.squadSlots.artifact }}</span>
                <span class="quota-tag quota--spell">☄ {{ playerStore.heroTemplate.squadSlots.spell }}</span>
              </div>
            </div>

            <!-- 操作按鈕 — 放在 B 區底部 -->
            <div class="b-actions">
              <Transition name="fade">
                <span v-if="errorMsg" class="error-msg-b">⚠ {{ errorMsg }}</span>
              </Transition>
              <div class="b-btn-row">
                <button class="btn-clear" :disabled="!hasDeckContent" @click="playerStore.clearDraft()">清空</button>
                <button
                  class="btn-save"
                  :disabled="!playerStore.isDeckValid()"
                  @click="saveSquad"
                >保存 ✓</button>
              </div>
              <button
                v-if="playerStore.activeSquadIndex !== -1"
                class="btn-delete-squad"
                @click="playerStore.deleteSquad(playerStore.activeSquadIndex)"
              >Delete Squad</button>
            </div>

          </template>

          <!-- 沒有選中牌組時 -->
          <div v-else class="b-empty-hero">
            <span class="b-empty-icon">🃏</span>
            <p>請先新增</p>
            <p>或選擇牌組</p>
          </div>
        </div>

      </div><!-- /top-half -->

      <!-- ── 下半截 C 區 (20%) — 1 排 6 格隊伍槽位 ─────────────────────── -->
      <div class="area-c-slots">
        <div
          v-for="(slot, i) in sortedSquadCards"
          :key="i"
          class="c-slot"
          :class="{ 'c-slot--filled': !!slot.tpl }"
          :title="slot.tpl ? `Click to remove: ${slot.tpl.name}` : 'Empty slot'"
          @click="slot.cardId && removeSlotCard(slot.cardId)"
        >
          <template v-if="slot.tpl">
            <div class="c-slot-card-frame">
              <CardComponent :card="toPreview(slot.tpl)" />
            </div>
            <div class="c-slot-remove-overlay">✕</div>
          </template>
          <div v-else class="c-slot-empty">
            <span class="c-slot-ph">＋</span>
          </div>
        </div>
      </div><!-- /area-c-slots -->

    </div><!-- /left-pane -->

    <!-- ═══════════════════════ RIGHT PANE — Card Library ══════════════════════ -->
    <div class="right-pane">

      <!-- Filter bar (fixed) -->
      <div class="filter-bar">
        <div class="filter-row">
          <span class="filter-label">Faction</span>
          <button
            v-for="f in FACTIONS" :key="f.id"
            class="filter-btn"
            :class="{ 'filter-btn--active': filterFaction === f.id }"
            @click="filterFaction = f.id"
          >{{ f.label }}</button>
        </div>
        <div class="filter-row">
          <span class="filter-label">Type</span>
          <button
            v-for="t in TYPES" :key="t.id"
            class="filter-btn"
            :class="{ 'filter-btn--active': filterType === t.id }"
            @click="filterType = t.id"
          >{{ t.label }}</button>
        </div>
      </div>

      <!-- Scrollable card grid -->
      <div class="card-grid">
        <div
          v-for="tpl in filteredCollection"
          :key="tpl.cardId"
          class="card-grid-slot"
          :class="{
            'card-grid-slot--maxed': isMaxed(tpl),
            'card-grid-slot--selected-hero': tpl.type === 'hero' && tpl.cardId === playerStore.draftSquad?.heroCardId,
          }"
          :title="slotHint(tpl)"
          @click="onClickCard(tpl)"
        >
          <CardComponent :card="toPreview(tpl)" />
          <div
            v-if="tpl.type !== 'hero' && copyCount(tpl.cardId) > 0"
            class="copy-badge"
          >×{{ copyCount(tpl.cardId) }}</div>
        </div>
        <div v-if="filteredCollection.length === 0" class="grid-empty">No cards match</div>
      </div>

    </div><!-- /right-pane -->

  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { usePlayerStore } from '../stores/player';
import CardComponent from '../components/CardComponent.vue';
import type { CardTemplate, CardInstance } from '@auto-battle/shared';

const playerStore = usePlayerStore();

// ── Constants ────────────────────────────────────────────────────────────────

const MAX_COPIES = 2;

const FACTIONS = [
  { id: 'all',     label: 'All' },
  { id: 'red',     label: '🔥 Red' },
  { id: 'blue',    label: '❄ Blue' },
  { id: 'green',   label: '🌿 Green' },
  { id: 'neutral', label: '⚪ Neutral' },
] as const;

const TYPES = [
  { id: 'all',      label: 'All' },
  { id: 'hero',     label: '👑 Hero' },
  { id: 'creature', label: '⚔ Creature' },
  { id: 'artifact', label: '🛡 Artifact' },
  { id: 'spell',    label: '☄ Spell' },
] as const;

const TYPE_LABELS: Record<string, string> = {
  creature: 'Creature', artifact: 'Artifact', spell: 'Spell', hero: 'Hero',
};
const FACTION_ICONS: Record<string, string> = {
  red: '🔥', blue: '❄', green: '🌿', neutral: '⚪',
};
const TYPE_ORDER: Record<string, number> = { creature: 0, artifact: 1, spell: 2 };

// ── State ────────────────────────────────────────────────────────────────────

const filterFaction = ref<string>('all');
const filterType    = ref<string>('all');
const errorMsg      = ref('');

// ── Computed ─────────────────────────────────────────────────────────────────

const filteredCollection = computed(() =>
  playerStore.collection.filter(tpl => {
    const fOk = filterFaction.value === 'all' || tpl.faction === filterFaction.value;
    const tOk = filterType.value    === 'all' || tpl.type    === filterType.value;
    return fOk && tOk;
  }),
);

const hasDeckContent = computed(() =>
  !!playerStore.draftSquad?.heroCardId || (playerStore.draftSquad?.cardIds.length ?? 0) > 0,
);

const filledCount = computed(() => playerStore.draftSquad?.cardIds.length ?? 0);

/**
 * Cards in the draft squad sorted creature → artifact → spell,
 * then padded with null entries to always produce exactly 6 items.
 */
const sortedSquadCards = computed<Array<{ tpl: CardTemplate | null; cardId: string | null }>>(() => {
  const squad = playerStore.draftSquad;
  if (!squad) return Array.from({ length: 6 }, () => ({ tpl: null, cardId: null }));

  const entries = squad.cardIds
    .map(id => {
      const tpl = playerStore.collection.find(t => t.cardId === id);
      return tpl && tpl.type !== 'hero' ? { tpl, cardId: id } : null;
    })
    .filter((x): x is { tpl: CardTemplate; cardId: string } => x !== null);

  entries.sort((a, b) => (TYPE_ORDER[a.tpl.type] ?? 99) - (TYPE_ORDER[b.tpl.type] ?? 99));

  const result: Array<{ tpl: CardTemplate | null; cardId: string | null }> = [...entries];
  while (result.length < 6) result.push({ tpl: null, cardId: null });
  return result;
});

// ── Helpers ───────────────────────────────────────────────────────────────────

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
  return playerStore.draftSquad?.cardIds.filter(id => id === cardId).length ?? 0;
}

function isMaxed(tpl: CardTemplate): boolean {
  const squad = playerStore.draftSquad;
  if (!squad) return false;
  if (tpl.type === 'hero') return tpl.cardId === squad.heroCardId;
  if (copyCount(tpl.cardId) >= MAX_COPIES) return true;
  const hero = playerStore.heroTemplate;
  if (!hero) return false;
  const cardType = tpl.type as 'creature' | 'artifact' | 'spell';
  const slotLimit = hero.squadSlots[cardType];
  const inDeck = squad.cardIds.filter(id => {
    const t = playerStore.collection.find(x => x.cardId === id);
    return t?.type === cardType;
  }).length;
  return inDeck >= slotLimit;
}

function slotHint(tpl: CardTemplate): string {
  const squad = playerStore.draftSquad;
  if (!squad) return '請先選擇牌組';
  if (tpl.type === 'hero')
    return tpl.cardId === squad.heroCardId ? '目前主將' : `選擇「${tpl.name}」為主將`;
  if (isMaxed(tpl)) return '槽位已滿或已達張數上限';
  return `加入「${tpl.name}」`;
}

function heroIconOf(heroCardId: string): string {
  if (!heroCardId) return '?';
  const hero = playerStore.collection.find(t => t.cardId === heroCardId);
  return hero ? (FACTION_ICONS[hero.faction] ?? '👑') : '?';
}

function heroNameOf(heroCardId: string): string {
  if (!heroCardId) return '—';
  return playerStore.collection.find(t => t.cardId === heroCardId)?.name ?? '—';
}

function heroImageOf(heroCardId: string): string | null {
  if (!heroCardId) return null;
  const hero = playerStore.collection.find(t => t.cardId === heroCardId);
  return hero?.imageUrl ?? null;
}

// ── Actions ───────────────────────────────────────────────────────────────────

function onClickCard(tpl: CardTemplate) {
  if (!playerStore.draftSquad) {
    errorMsg.value = '請先選擇牌組';
    setTimeout(() => { errorMsg.value = ''; }, 2500);
    return;
  }
  if (isMaxed(tpl)) return;
  errorMsg.value = '';
  if (tpl.type === 'hero') {
    playerStore.setHero(tpl.cardId);
  } else {
    const result = playerStore.addCardToDeck(tpl.cardId);
    if (!result.ok) {
      errorMsg.value = result.reason ?? '無法加入';
      setTimeout(() => { errorMsg.value = ''; }, 2500);
    }
  }
}

function removeSlotCard(cardId: string) {
  const idx = playerStore.draftSquad?.cardIds.indexOf(cardId) ?? -1;
  if (idx >= 0) playerStore.removeCardFromDeck(idx);
}

function saveSquad() {
  if (!playerStore.isDeckValid()) {
    errorMsg.value = '請先選擇主將並加入至少 1 張卡片';
    setTimeout(() => { errorMsg.value = ''; }, 2500);
    return;
  }
  errorMsg.value = '';
  playerStore.saveSquad();
}

onMounted(() => {
  if (playerStore.squads.length > 0) {
    playerStore.selectSquad(0);
  } else {
    playerStore.createNewSquad();
  }
});
</script>

<style scoped>
/* ── Root ─────────────────────────────────────────────────────────────────── */
.deck-builder {
  display: flex;
  flex-direction: row;
  height: 100%;
  overflow: hidden;
  background: #0d0d1a;
  color: #e2e8f0;
}

/* ═══════════════════════════════════════════════════════════════════════════
   LEFT PANE — exact spec layout
   ═══════════════════════════════════════════════════════════════════════════ */
.left-pane {
  flex: 0 0 50%;
  width: 50%;
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 16px;
  gap: 16px;
  box-sizing: border-box;
}

/* ── 上半截 (70%) ──────────────────────────────────────────────────────────── */
.top-half {
  flex: 0 0 calc(70% - 8px);
  display: flex;
  flex-direction: row;
  gap: 16px;
}

/* A 區：左 70%，3 欄 4 列精準切割，常駐滾動條 */
.area-a-squads {
  flex: 0 0 calc(70% - 8px);
  height: 100%;
  box-sizing: border-box;
  background: #0f172a;
  border: 2px solid #334155;
  border-radius: 8px;
  padding: 12px;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  grid-auto-rows: calc((100% - 20px) / 3);
  gap: 10px;
  overflow-y: scroll; /* 常駐滾動條，防版面跳動 */
  align-content: start;
}

/* 讓 A 區每個子元素撐滿格子 */
.area-a-squads > * {
  width: 100%;
  height: 100%;
  box-sizing: border-box;
}

/* Custom dark scrollbar for A */
.area-a-squads::-webkit-scrollbar        { width: 6px; }
.area-a-squads::-webkit-scrollbar-track  { background: rgba(0,0,0,0.2); border-radius: 3px; }
.area-a-squads::-webkit-scrollbar-thumb  { background: #334155; border-radius: 3px; }
.area-a-squads::-webkit-scrollbar-thumb:hover { background: #475569; }

/* Squad thumb */
.squad-thumb {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  border: 1px solid #1e293b;
  border-radius: 8px;
  background: rgba(255,255,255,0.03);
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
  overflow: hidden;
  padding: 6px 4px;
}
.squad-thumb:hover {
  border-color: #475569;
  background: rgba(255,255,255,0.06);
}
.squad-thumb--active {
  border-color: #b8922a;
  background: rgba(184,146,42,0.12);
  box-shadow: inset 0 0 0 1px rgba(184,146,42,0.3);
}
.squad-thumb--draft {
  border-style: dashed;
  border-color: #60a5fa;
  background: rgba(96,165,250,0.08);
  box-shadow: inset 0 0 0 1px rgba(96,165,250,0.2);
}

/* Squad thumb with background image */
.squad-thumb--has-image { position: relative; }

/* Dark overlay on top of image */
.squad-thumb-img-mask {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.50);
  border-radius: 7px;
  pointer-events: none;
}

/* Number badge rendered above the mask */
.squad-thumb-num--over-img {
  position: relative;
  z-index: 1;
  font-size: 12px;
  font-weight: 700;
  color: #f1f5f9;
}
.squad-thumb-icon { font-size: 1.6rem; }
.squad-thumb-hero {
  font-size: 9px;
  color: #94a3b8;
  text-align: center;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  width: 100%;
  padding: 0 4px;
}
.squad-thumb-num { font-size: 9px; color: #4b5563; }

/* + 新增按鈕（同 grid 內） */
.add-squad-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  border: 1px dashed #334155;
  border-radius: 8px;
  background: transparent;
  cursor: pointer;
  transition: border-color 0.15s, color 0.15s, background 0.15s;
  user-select: none;
}
.add-squad-btn:hover {
  border-color: #60a5fa;
  background: rgba(96,165,250,0.06);
}
.add-squad-plus  { font-size: 1.6rem; color: #4b5563; transition: color 0.15s; }
.add-squad-label { font-size: 9px;    color: #4b5563; transition: color 0.15s; }
.add-squad-btn:hover .add-squad-plus,
.add-squad-btn:hover .add-squad-label { color: #93c5fd; }

/* B 區：右 30%，英雄卡 + 操作 */
.area-b-hero {
  flex: 0 0 calc(30% - 8px);
  background: #0f172a;
  border: 2px solid #334155;
  border-radius: 8px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  overflow: hidden;
}

/* Hero card: fills B area width, clips vertically */
.b-hero-card-frame {
  flex: 1;
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  overflow: hidden;
  min-height: 0;
}
/* Force the CardComponent to fill the B width */
.b-hero-card-frame :deep(> *) {
  width: 100% !important;
  max-width: none !important;
}

/* Empty hero placeholder inside B */
.b-empty-hero {
  flex: 1;
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: 2px dashed #1e293b;
  border-radius: 8px;
  background: rgba(255,255,255,0.01);
  text-align: center;
}
.b-empty-icon { font-size: 2rem; opacity: 0.3; }
.b-empty-hero p { margin: 0; font-size: 11px; color: #4b5563; }
.b-empty-hint   { font-size: 10px; color: #374151 !important; }

/* Hero meta info */
.b-hero-meta {
  flex-shrink: 0;
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 5px;
}
.b-hero-name-row {
  display: flex;
  align-items: center;
  gap: 5px;
  flex-wrap: wrap;
}
.b-hero-name { font-size: 12px; font-weight: 700; color: #f1f5f9; }

.faction-badge {
  font-size: 8px;
  font-weight: 800;
  padding: 2px 5px;
  border-radius: 3px;
  flex-shrink: 0;
}
.faction--red     { background: rgba(153,27,27,0.4);  color: #fca5a5; }
.faction--blue    { background: rgba(30,58,138,0.4);  color: #93c5fd; }
.faction--green   { background: rgba(6,78,59,0.4);    color: #6ee7b7; }
.faction--neutral { background: rgba(55,65,81,0.4);   color: #9ca3af; }

.quota-row { display: flex; gap: 4px; flex-wrap: wrap; }
.quota-tag {
  font-size: 9px;
  font-weight: 700;
  padding: 2px 5px;
  border-radius: 4px;
}
.quota--creature { background: rgba(37,99,235,0.18);  color: #93c5fd; border: 1px solid #1e40af; }
.quota--artifact { background: rgba(180,83,9,0.18);   color: #fde68a; border: 1px solid #92400e; }
.quota--spell    { background: rgba(5,150,105,0.18);  color: #6ee7b7; border: 1px solid #065f46; }

/* B area action buttons */
.b-actions {
  flex-shrink: 0;
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 5px;
}
.error-msg-b {
  font-size: 10px;
  color: #fca5a5;
  text-align: center;
  word-break: break-word;
}
.b-btn-row { display: flex; gap: 5px; }

.btn-clear {
  flex: 1;
  padding: 6px 4px;
  border: 1px solid #1f2937;
  border-radius: 6px;
  background: transparent;
  color: #6b7280;
  font-size: 10px;
  cursor: pointer;
  transition: all 0.15s;
  white-space: nowrap;
}
.btn-clear:hover:not(:disabled) { border-color: #ef4444; color: #f87171; }
.btn-clear:disabled { opacity: 0.3; cursor: not-allowed; }

.btn-save {
  flex: 2;
  padding: 6px 4px;
  background: linear-gradient(135deg, #064e3b, #059669);
  border: none;
  border-radius: 6px;
  color: #fff;
  font-size: 10px;
  font-weight: 700;
  cursor: pointer;
  transition: opacity 0.15s;
  white-space: nowrap;
}
.btn-save:hover:not(:disabled) { opacity: 0.85; }
.btn-save:disabled { opacity: 0.35; cursor: not-allowed; }

.btn-delete-squad {
  width: 100%;
  padding: 5px;
  border: 1px solid #7f1d1d;
  border-radius: 6px;
  background: transparent;
  color: #f87171;
  font-size: 10px;
  cursor: pointer;
  transition: background 0.15s;
}
.btn-delete-squad:hover { background: rgba(239,68,68,0.1); }

/* ── 下半截 C 區 (30%) — 1 排 6 格，長方形卡片 ──────────────────────── */
.area-c-slots {
  flex: 0 0 calc(30% - 8px);
  background: #0f172a;
  border: 2px solid #334155;
  border-radius: 8px;
  padding: 12px;
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  grid-template-rows: 1fr;
  gap: 10px;
  align-items: stretch;
}

/* Individual C slot — stretches to fill the grid row */
.c-slot {
  border: 1px dashed #1e293b;
  border-radius: 6px;
  overflow: hidden;
  position: relative;
  display: flex;
  align-items: stretch;
  background: rgba(255,255,255,0.02);
  transition: border-color 0.15s;
  min-height: 0;
}
.c-slot--filled {
  border-style: solid;
  border-color: #334155;
  cursor: pointer;
}
.c-slot--filled:hover { border-color: #ef4444; }
.c-slot--filled:hover .c-slot-remove-overlay { opacity: 1; }

/* Card inside C slot: fills width AND height */
.c-slot-card-frame {
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  overflow: hidden;
}
.c-slot-card-frame :deep(> *) {
  width: 100% !important;
  height: 100% !important;
  max-width: none !important;
}

/* Remove overlay */
.c-slot-remove-overlay {
  position: absolute;
  inset: 0;
  background: rgba(239,68,68,0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.1rem;
  color: #fca5a5;
  opacity: 0;
  transition: opacity 0.15s;
}

/* Empty C slot: fills full cell */
.c-slot-empty {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}
.c-slot-ph { font-size: 1rem; color: #1e293b; }

/* ═══════════════════════════════════════════════════════════════════════════
   RIGHT PANE — unchanged
   ═══════════════════════════════════════════════════════════════════════════ */
.right-pane {
  flex: 0 0 50%;
  width: 50%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #0f172a;
  border-left: 2px solid #334155;
  box-sizing: border-box;
}

/* Filter bar (fixed) */
.filter-bar {
  flex-shrink: 0;
  padding: 10px 16px;
  border-bottom: 1px solid #334155;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.filter-row {
  display: flex;
  align-items: center;
  gap: 5px;
  flex-wrap: wrap;
}
.filter-label {
  font-size: 10px;
  font-weight: 700;
  color: #4b5563;
  letter-spacing: 1px;
  text-transform: uppercase;
  min-width: 44px;
}
.filter-btn {
  padding: 3px 10px;
  border: 1px solid #1e293b;
  border-radius: 20px;
  background: transparent;
  color: #6b7280;
  font-size: 11px;
  cursor: pointer;
  transition: all 0.15s;
}
.filter-btn:hover { color: #e2e8f0; border-color: #334155; }
.filter-btn--active { background: #1e3a5f; color: #93c5fd; border-color: #2563eb; }

/* Scrollable card grid — 3 欄 × 6 列精準切割，常駐滾動條 */
.card-grid {
  flex: 1;
  box-sizing: border-box;
  background: #1e293b;
  border: 2px solid #334155;
  border-radius: 8px;
  padding: 12px;
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  /* 3 列之間有 2 個 gap (2×10px=20px)，扣除後等分為 3 列 */
  grid-auto-rows: calc((100% - 20px) / 3);
  gap: 10px;
  overflow-y: scroll; /* 常駐滾動條，防版面跳動 */
  align-content: start;
}

/* 強制卡牌撐滿格子 */
.card-grid > * {
  width: 100%;
  height: 100%;
  box-sizing: border-box;
  max-width: none;
}

/* Custom dark scrollbar for card grid */
.card-grid::-webkit-scrollbar        { width: 6px; }
.card-grid::-webkit-scrollbar-track  { background: rgba(0,0,0,0.2); border-radius: 3px; }
.card-grid::-webkit-scrollbar-thumb  { background: #334155; border-radius: 3px; }
.card-grid::-webkit-scrollbar-thumb:hover { background: #475569; }

.card-grid-slot {
  position: relative;
  cursor: pointer;
  border-radius: 8px;
  transition: transform 0.15s, opacity 0.15s, box-shadow 0.15s;
}
.card-grid-slot:hover { transform: translateY(-4px); }
.card-grid-slot--maxed { opacity: 0.3; cursor: not-allowed; }
.card-grid-slot--maxed:hover { transform: none; }
.card-grid-slot--selected-hero :deep(.card-wrapper) {
  box-shadow: 0 0 0 2px #f59e0b, 0 0 12px rgba(245,158,11,0.3);
}

.copy-badge {
  position: absolute;
  top: -6px; right: -6px;
  background: #3b82f6;
  color: #fff;
  font-size: 9px;
  font-weight: 800;
  border-radius: 10px;
  padding: 2px 5px;
  pointer-events: none;
}

.grid-empty {
  grid-column: 1 / -1;
  text-align: center;
  color: #374151;
  font-size: 12px;
  padding: 32px;
}

/* ── Transitions ─────────────────────────────────────────────────────────── */
.fade-enter-active, .fade-leave-active { transition: opacity 0.25s; }
.fade-enter-from, .fade-leave-to       { opacity: 0; }
</style>
