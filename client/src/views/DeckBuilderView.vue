<template>
  <div class="deck-builder">

    <!-- ═══════════════════════ LEFT PANE — Formation ═══════════════════════ -->
    <div class="left-pane">

      <!-- ── A · Squad strip (independent scroll) ──────────────────────────── -->
      <div class="squad-strip">
        <div class="squad-grid-scroll">
          <div
            v-for="(squad, idx) in playerStore.squads"
            :key="idx"
            class="squad-thumb"
            :class="{ 'squad-thumb--active': playerStore.activeSquadIndex === idx }"
            :title="`Squad ${idx + 1}`"
            @click="playerStore.setActiveSquad(idx)"
          >
            <span class="squad-thumb-icon">{{ heroIconOf(squad.heroCardId) }}</span>
            <span class="squad-thumb-num">#{{ idx + 1 }}</span>
          </div>

          <!-- + button lives inside the same grid, always last -->
          <div class="add-squad-btn" title="New Squad" @click="playerStore.createNewSquad()">＋</div>
        </div>
      </div>

      <!-- ── B + C area ──────────────────────────────────────────────────────── -->
      <div class="bc-area">

        <!-- Empty state: no squad selected -->
        <div v-if="playerStore.activeSquadIndex === -1" class="no-squad-state">
          <span class="no-squad-icon">🃏</span>
          <p>請先新增或選擇一副牌組</p>
          <p class="no-squad-hint">點擊上方的「＋」新增牌組</p>
        </div>

        <template v-else>
          <!-- B · Hero display -->
          <div class="hero-display">
            <template v-if="playerStore.heroTemplate">
              <div class="hero-card-frame">
                <div class="hero-card-scaler">
                  <CardComponent :card="toPreview(playerStore.heroTemplate)" />
                </div>
              </div>
              <div class="hero-meta">
                <div class="hero-meta-name">
                  <span class="faction-badge" :class="`faction--${playerStore.heroTemplate.faction}`">
                    {{ playerStore.heroTemplate.faction.toUpperCase() }}
                  </span>
                  <span class="hero-name-text">{{ playerStore.heroTemplate.name }}</span>
                </div>
                <div class="quota-row">
                  <span class="quota-tag quota--creature">⚔ {{ playerStore.heroTemplate.squadSlots.creature }}</span>
                  <span class="quota-tag quota--artifact">🛡 {{ playerStore.heroTemplate.squadSlots.artifact }}</span>
                  <span class="quota-tag quota--spell">☄ {{ playerStore.heroTemplate.squadSlots.spell }}</span>
                </div>
                <div class="hero-btns">
                  <button
                    class="btn-danger"
                    @click="playerStore.deleteSquad(playerStore.activeSquadIndex)"
                  >Delete Squad</button>
                </div>
              </div>
            </template>

            <div v-else class="hero-slot-empty">
              <span class="hero-slot-empty-icon">👑</span>
              <p>請選擇主將</p>
              <p class="hero-slot-empty-hint">從右側過濾「Hero」後點擊</p>
            </div>
          </div>

          <!-- C · Squad slots -->
          <div class="squad-slots-area">
            <div class="slots-header">
              <span class="pane-label">SQUAD</span>
              <span class="slot-count" :class="{ 'slot-count--full': filledCount >= 6 }">
                {{ filledCount }} / 6
              </span>
            </div>

            <div class="slots-grid">
              <div
                v-for="(slot, i) in sortedSquadCards"
                :key="i"
                class="squad-slot-cell"
                :class="{ 'squad-slot-cell--filled': !!slot.tpl }"
                :title="slot.tpl ? `Click to remove: ${slot.tpl.name}` : 'Empty slot'"
                @click="slot.cardId && removeSlotCard(slot.cardId)"
              >
                <template v-if="slot.tpl">
                  <div class="slot-card-scaler">
                    <CardComponent :card="toPreview(slot.tpl)" />
                  </div>
                  <div class="slot-remove-overlay">✕</div>
                </template>
                <div v-else class="slot-empty-cell">
                  <span class="slot-empty-ph">＋</span>
                </div>
              </div>
            </div>

            <!-- Actions -->
            <div class="slot-actions">
              <Transition name="fade">
                <span v-if="errorMsg" class="error-msg">⚠ {{ errorMsg }}</span>
              </Transition>
              <button class="btn-clear" :disabled="!hasDeckContent" @click="clearDeck">清空</button>
              <button
                class="btn-fight"
                :disabled="!playerStore.isDeckValid() || loading"
                @click="startBattle"
              >{{ loading ? '連線中…' : '出戰 ▶' }}</button>
            </div>
          </div>
        </template>

      </div><!-- /bc-area -->

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
            'card-grid-slot--selected-hero': tpl.type === 'hero' && tpl.cardId === playerStore.activeSquad?.heroCardId,
          }"
          :title="slotHint(tpl)"
          @click="onClickCard(tpl)"
        >
          <CardComponent :card="toPreview(tpl)" />
          <div
            v-if="tpl.type !== 'hero' && copyCount(tpl.cardId) > 0"
            class="copy-badge"
          >×{{ copyCount(tpl.cardId) }}</div>
          <div
            v-if="tpl.type === 'hero' && tpl.cardId === playerStore.activeSquad?.heroCardId"
            class="active-hero-badge"
          >✓ Active</div>
        </div>
        <div v-if="filteredCollection.length === 0" class="grid-empty">No cards match</div>
      </div>

    </div><!-- /right-pane -->

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
const loading       = ref(false);

// ── Computed ─────────────────────────────────────────────────────────────────

const filteredCollection = computed(() =>
  playerStore.collection.filter(tpl => {
    const fOk = filterFaction.value === 'all' || tpl.faction === filterFaction.value;
    const tOk = filterType.value    === 'all' || tpl.type    === filterType.value;
    return fOk && tOk;
  }),
);

const hasDeckContent = computed(() =>
  !!playerStore.activeSquad?.heroCardId || (playerStore.activeSquad?.cardIds.length ?? 0) > 0,
);

const filledCount = computed(() => playerStore.activeSquad?.cardIds.length ?? 0);

/**
 * Cards in the active squad sorted creature → artifact → spell,
 * then padded with null entries to always produce exactly 6 items.
 */
const sortedSquadCards = computed<Array<{ tpl: CardTemplate | null; cardId: string | null }>>(() => {
  const squad = playerStore.activeSquad;
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
  return playerStore.activeSquad?.cardIds.filter(id => id === cardId).length ?? 0;
}

function isMaxed(tpl: CardTemplate): boolean {
  const squad = playerStore.activeSquad;
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
  const squad = playerStore.activeSquad;
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

// ── Actions ───────────────────────────────────────────────────────────────────

function onClickCard(tpl: CardTemplate) {
  if (!playerStore.activeSquad) {
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
  const idx = playerStore.activeSquad?.cardIds.indexOf(cardId) ?? -1;
  if (idx >= 0) playerStore.removeCardFromDeck(idx);
}

function clearDeck() {
  playerStore.setHero('');
}

function startBattle() {
  if (!playerStore.isDeckValid()) {
    errorMsg.value = '請先選擇主將並加入至少 1 張卡片';
    return;
  }
  errorMsg.value = '';
  loading.value  = true;
  battleStore.startCampaign(playerStore.activeSquad!);
}
</script>

<style scoped>
/* ── Root ───────────────────────────────────────────────────────────────────── */
.deck-builder {
  display: flex;
  flex-direction: row;
  height: 100%;
  overflow: hidden;
  background: #0d0d1a;
  color: #e2e8f0;
}

/* ═══════════════════════════════════════════════════════════════════════════
   LEFT PANE
   ═══════════════════════════════════════════════════════════════════════════ */
.left-pane {
  width: 50%;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  padding: 16px;
  gap: 12px;
  box-sizing: border-box;
}

/* ── A · Squad strip ─────────────────────────────────────────────────────── */
.squad-strip {
  flex: 0 0 120px;
  overflow-y: auto;
  padding-right: 4px; /* space for scrollbar */
}

/* Custom dark scrollbar */
.squad-strip::-webkit-scrollbar        { width: 4px; }
.squad-strip::-webkit-scrollbar-track  { background: transparent; }
.squad-strip::-webkit-scrollbar-thumb  { background: #334155; border-radius: 2px; }
.squad-strip::-webkit-scrollbar-thumb:hover { background: #475569; }

.squad-grid-scroll {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(60px, 1fr));
  gap: 8px;
  align-content: start;
}

.squad-thumb {
  aspect-ratio: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3px;
  border: 1px solid #1e293b;
  border-radius: 8px;
  background: rgba(255,255,255,0.03);
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
}
.squad-thumb:hover { border-color: #334155; background: rgba(255,255,255,0.06); }
.squad-thumb--active {
  border-color: #b8922a;
  background: rgba(184,146,42,0.1);
  box-shadow: 0 0 8px rgba(184,146,42,0.2);
}
.squad-thumb-icon { font-size: 1.3rem; }
.squad-thumb-num  { font-size: 9px; color: #6b7280; }

.add-squad-btn {
  aspect-ratio: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px dashed #334155;
  border-radius: 8px;
  background: transparent;
  color: #4b5563;
  font-size: 1.5rem;
  cursor: pointer;
  transition: color 0.15s, border-color 0.15s, background 0.15s;
  user-select: none;
}
.add-squad-btn:hover { color: #94a3b8; border-color: #475569; background: rgba(255,255,255,0.04); }

/* ── B + C area ──────────────────────────────────────────────────────────── */
.bc-area {
  flex: 1;
  display: flex;
  gap: 16px;
  min-height: 0;
}

/* Empty state */
.no-squad-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  border: 2px dashed #1e293b;
  border-radius: 12px;
  color: #374151;
  text-align: center;
}
.no-squad-icon { font-size: 2.5rem; opacity: 0.4; }
.no-squad-state p { margin: 0; font-size: 13px; color: #4b5563; }
.no-squad-hint { font-size: 11px; color: #374151 !important; }

/* ── B · Hero display ────────────────────────────────────────────────────── */
.hero-display {
  flex: 0 0 40%;
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-height: 0;
}

.hero-card-frame {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  overflow: hidden;
  min-height: 0;
}
.hero-card-scaler {
  transform: scale(0.85);
  transform-origin: top center;
  flex-shrink: 0;
}

.hero-meta {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 8px 10px;
  background: rgba(255,255,255,0.03);
  border: 1px solid #1e293b;
  border-radius: 8px;
}
.hero-meta-name { display: flex; align-items: center; gap: 6px; }
.hero-name-text { font-size: 13px; font-weight: 700; color: #f1f5f9; }

.faction-badge {
  font-size: 9px;
  font-weight: 800;
  padding: 2px 6px;
  border-radius: 4px;
  letter-spacing: 0.5px;
  flex-shrink: 0;
}
.faction--red     { background: rgba(153,27,27,0.4);  color: #fca5a5; }
.faction--blue    { background: rgba(30,58,138,0.4);  color: #93c5fd; }
.faction--green   { background: rgba(6,78,59,0.4);    color: #6ee7b7; }
.faction--neutral { background: rgba(55,65,81,0.4);   color: #9ca3af; }

.quota-row { display: flex; gap: 5px; flex-wrap: wrap; }
.quota-tag {
  font-size: 10px;
  font-weight: 700;
  padding: 2px 7px;
  border-radius: 5px;
}
.quota--creature { background: rgba(37,99,235,0.18);  color: #93c5fd; border: 1px solid #1e40af; }
.quota--artifact { background: rgba(180,83,9,0.18);   color: #fde68a; border: 1px solid #92400e; }
.quota--spell    { background: rgba(5,150,105,0.18);  color: #6ee7b7; border: 1px solid #065f46; }

.hero-btns { display: flex; gap: 6px; }
.btn-danger {
  padding: 5px 10px;
  border: 1px solid #7f1d1d;
  border-radius: 6px;
  background: transparent;
  color: #f87171;
  font-size: 11px;
  cursor: pointer;
  transition: background 0.15s;
}
.btn-danger:hover { background: rgba(239,68,68,0.12); }

/* Empty hero slot */
.hero-slot-empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: 2px dashed #1e293b;
  border-radius: 12px;
  background: rgba(255,255,255,0.02);
  color: #374151;
  text-align: center;
}
.hero-slot-empty-icon { font-size: 2rem; opacity: 0.35; }
.hero-slot-empty p { margin: 0; font-size: 12px; color: #4b5563; }
.hero-slot-empty-hint { font-size: 10px; color: #374151 !important; }

/* ── C · Squad slots ─────────────────────────────────────────────────────── */
.squad-slots-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-height: 0;
}

.slots-header {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}
.pane-label {
  font-size: 9px;
  font-weight: 800;
  color: #4b5563;
  letter-spacing: 1.5px;
  text-transform: uppercase;
}
.slot-count       { font-size: 11px; color: #6b7280; font-weight: 600; }
.slot-count--full { color: #f87171; }

.slots-grid {
  flex: 1;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  align-content: start;
  min-height: 0;
}

/* Slot cell wrapper */
.squad-slot-cell {
  position: relative;
  border-radius: 8px;
  overflow: hidden;
  background: rgba(255,255,255,0.02);
  border: 1px dashed #1e293b;
  transition: border-color 0.15s;
  min-height: 80px;
  display: flex;
  align-items: stretch;
}
.squad-slot-cell--filled {
  border-style: solid;
  border-color: #334155;
  cursor: pointer;
}
.squad-slot-cell--filled:hover { border-color: #ef4444; }
.squad-slot-cell--filled:hover .slot-remove-overlay { opacity: 1; }

/* Card scaled inside slot */
.slot-card-scaler {
  transform: scale(0.72);
  transform-origin: top center;
  flex-shrink: 0;
  width: 100%;
  display: flex;
  justify-content: center;
}

/* Remove overlay on hover */
.slot-remove-overlay {
  position: absolute;
  inset: 0;
  background: rgba(239,68,68,0.25);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.4rem;
  color: #fca5a5;
  opacity: 0;
  transition: opacity 0.15s;
}

/* Empty slot */
.slot-empty-cell {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}
.slot-empty-ph { font-size: 1.2rem; color: #1e293b; }

/* Slot actions row */
.slot-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}
.error-msg { flex: 1; font-size: 11px; color: #fca5a5; }

.btn-clear {
  padding: 7px 12px;
  border: 1px solid #1f2937;
  border-radius: 6px;
  background: transparent;
  color: #6b7280;
  font-size: 11px;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.15s;
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
  white-space: nowrap;
  transition: opacity 0.15s, transform 0.15s;
}
.btn-fight:hover:not(:disabled) { opacity: 0.88; transform: translateY(-1px); }
.btn-fight:disabled { opacity: 0.35; cursor: not-allowed; }

/* ═══════════════════════════════════════════════════════════════════════════
   RIGHT PANE — unchanged
   ═══════════════════════════════════════════════════════════════════════════ */
.right-pane {
  width: 50%;
  display: flex;
  flex-direction: column;
  background: #0f172a;
  border-left: 2px solid #334155;
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

/* Scrollable card grid */
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
  border-radius: 8px;
  transition: transform 0.15s, opacity 0.15s, box-shadow 0.15s;
}
.card-grid-slot:hover { transform: translateY(-4px); }
.card-grid-slot--maxed { opacity: 0.3; cursor: not-allowed; }
.card-grid-slot--maxed:hover { transform: none; }
.card-grid-slot--selected-hero {
  box-shadow: 0 0 0 2px #f59e0b, 0 0 12px rgba(245,158,11,0.3);
  border-radius: 8px;
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
.active-hero-badge {
  position: absolute;
  bottom: 4px; left: 50%;
  transform: translateX(-50%);
  background: rgba(245,158,11,0.9);
  color: #000;
  font-size: 9px;
  font-weight: 800;
  border-radius: 4px;
  padding: 1px 5px;
  pointer-events: none;
  white-space: nowrap;
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
