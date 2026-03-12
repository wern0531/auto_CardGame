<template>
  <div class="deck-builder">

    <!-- ═══════════════ LEFT PANE — Formation ═══════════════ -->
    <div class="left-pane">

      <!-- ── Top row: A (squad list) + B/C (hero details) ─────────────────── -->
      <div class="top-row">

        <!-- A · Squad thumbnails -->
        <div class="squad-list">
          <div class="pane-label">SQUADS</div>
          <div class="squad-entries">
            <div
              v-for="(squad, idx) in playerStore.squads"
              :key="idx"
              class="squad-thumb"
              :class="{ 'squad-thumb--active': playerStore.activeSquadIndex === idx }"
              :title="`Squad ${idx + 1}`"
              @click="playerStore.setActiveSquad(idx)"
            >
              <span class="squad-thumb-icon">{{ heroIconOf(squad.heroCardId) }}</span>
              <span class="squad-thumb-num">{{ idx + 1 }}</span>
            </div>
          </div>
          <button class="btn-add-squad" @click="playerStore.createNewSquad()" title="New Squad">＋</button>
        </div>

        <!-- B/C · Hero details + quota tags + actions -->
        <div class="hero-details">
          <template v-if="playerStore.heroTemplate">
            <div class="hero-header">
              <span class="faction-badge" :class="`faction--${playerStore.heroTemplate.faction}`">
                {{ playerStore.heroTemplate.faction.toUpperCase() }}
              </span>
              <span class="hero-name">{{ playerStore.heroTemplate.name }}</span>
            </div>
            <div class="hero-stats">
              <span class="stat-chip">❤ {{ playerStore.heroTemplate.baseStats.hp }}</span>
              <span class="stat-chip">⚔ {{ playerStore.heroTemplate.baseStats.attack }}</span>
              <span class="stat-chip">⏱ CD {{ playerStore.heroTemplate.baseStats.cooldown }}</span>
            </div>
            <div class="quota-row">
              <span class="quota-tag quota--creature">⚔ {{ playerStore.heroTemplate.squadSlots.creature }} Creature</span>
              <span class="quota-tag quota--artifact">🛡 {{ playerStore.heroTemplate.squadSlots.artifact }} Artifact</span>
              <span class="quota-tag quota--spell">☄ {{ playerStore.heroTemplate.squadSlots.spell }} Spell</span>
            </div>
            <div class="hero-actions">
              <button class="btn-secondary" title="功能開發中">Edit Squad</button>
              <button
                class="btn-danger"
                :disabled="playerStore.squads.length <= 1"
                @click="playerStore.deleteSquad(playerStore.activeSquadIndex)"
              >Delete</button>
            </div>
          </template>

          <div v-else class="hero-empty">
            <span class="hero-empty-icon">👑</span>
            <p>No hero selected</p>
            <p class="hero-empty-hint">Filter "Hero" in the card library →</p>
          </div>
        </div>

      </div><!-- /top-row -->

      <!-- ── D · 6-slot squad grid ──────────────────────────────────────────── -->
      <div class="slot-section">
        <div class="slot-section-header">
          <span class="pane-label">SQUAD FORMATION</span>
          <span class="slot-count" :class="{ 'slot-count--full': filledCount >= 6 }">
            {{ filledCount }} / 6
          </span>
        </div>

        <div class="slot-grid">
          <div
            v-for="(slot, idx) in slotsWithCards"
            :key="idx"
            class="squad-slot"
            :class="[`squad-slot--${slot.type}`, { 'squad-slot--filled': !!slot.cardId }]"
            :title="slot.cardId ? `Remove: ${nameOf(slot.cardId)}` : `Empty ${typeLabel(slot.type)} slot`"
            @click="slot.cardId && removeCardBySlot(slot)"
          >
            <template v-if="slot.cardId">
              <span class="slot-type-tag" :class="`type--${slot.type}`">{{ typeLabel(slot.type) }}</span>
              <span class="slot-card-name">{{ nameOf(slot.cardId) }}</span>
              <span class="slot-remove">✕</span>
            </template>
            <template v-else>
              <span class="slot-ph-icon">{{ typeIcon(slot.type) }}</span>
              <span class="slot-ph-label">{{ typeLabel(slot.type) }}</span>
            </template>
          </div>
        </div>

        <!-- Actions row -->
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

    </div><!-- /left-pane -->

    <!-- ═══════════════ RIGHT PANE — Card Library ════════════════ -->
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
            'card-grid-slot--selected-hero': tpl.type === 'hero' && tpl.cardId === playerStore.activeSquad.heroCardId,
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
            v-if="tpl.type === 'hero' && tpl.cardId === playerStore.activeSquad.heroCardId"
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

const MAX_COPIES  = 2;
const TOTAL_SLOTS = 6;

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
const TYPE_ICONS: Record<string, string> = {
  creature: '⚔', artifact: '🛡', spell: '☄', hero: '👑',
};
const FACTION_ICONS: Record<string, string> = {
  red: '🔥', blue: '❄', green: '🌿', neutral: '⚪',
};

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
  !!playerStore.activeSquad.heroCardId || playerStore.activeSquad.cardIds.length > 0,
);

const filledCount = computed(() => playerStore.activeSquad.cardIds.length);

/** 6 typed slot definitions based on the active hero's squadSlots. */
const slotDefs = computed(() => {
  const hero = playerStore.heroTemplate;
  const defs: Array<{ type: 'creature' | 'artifact' | 'spell' }> = [];
  const { creature = 6, artifact = 0, spell = 0 } = hero?.squadSlots ?? {};
  for (let i = 0; i < creature; i++) defs.push({ type: 'creature' });
  for (let i = 0; i < artifact; i++) defs.push({ type: 'artifact' });
  for (let i = 0; i < spell;    i++) defs.push({ type: 'spell'    });
  return defs;
});

/** Each of the 6 slots paired with the card (if any) currently filling it. */
const slotsWithCards = computed(() => {
  const cardIds = playerStore.activeSquad.cardIds;
  const byType: Record<string, string[]> = { creature: [], artifact: [], spell: [] };

  for (const cardId of cardIds) {
    const tpl = playerStore.collection.find(t => t.cardId === cardId);
    if (tpl && tpl.type !== 'hero') byType[tpl.type].push(cardId);
  }

  const cursors: Record<string, number> = { creature: 0, artifact: 0, spell: 0 };
  return slotDefs.value.map(def => ({
    type:   def.type,
    cardId: byType[def.type][cursors[def.type]++] ?? null,
  }));
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
  return playerStore.activeSquad.cardIds.filter(id => id === cardId).length;
}

function isMaxed(tpl: CardTemplate): boolean {
  if (tpl.type === 'hero') return tpl.cardId === playerStore.activeSquad.heroCardId;
  if (copyCount(tpl.cardId) >= MAX_COPIES) return true;
  const hero = playerStore.heroTemplate;
  if (!hero) return false;
  const cardType = tpl.type as 'creature' | 'artifact' | 'spell';
  const slotLimit = hero.squadSlots[cardType];
  const inDeck = playerStore.activeSquad.cardIds.filter(id => {
    const t = playerStore.collection.find(x => x.cardId === id);
    return t?.type === cardType;
  }).length;
  return inDeck >= slotLimit;
}

function slotHint(tpl: CardTemplate): string {
  if (tpl.type === 'hero')
    return tpl.cardId === playerStore.activeSquad.heroCardId ? '目前主將' : `選擇「${tpl.name}」為主將`;
  if (isMaxed(tpl)) return '槽位已滿或已達張數上限';
  return `加入「${tpl.name}」`;
}

function nameOf(cardId: string): string {
  return playerStore.collection.find(t => t.cardId === cardId)?.name ?? cardId;
}

function typeLabel(type: string): string {
  return TYPE_LABELS[type] ?? type;
}

function typeIcon(type: string): string {
  return TYPE_ICONS[type] ?? '?';
}

function heroIconOf(heroCardId: string): string {
  if (!heroCardId) return '?';
  const hero = playerStore.collection.find(t => t.cardId === heroCardId);
  return hero ? (FACTION_ICONS[hero.faction] ?? '👑') : '?';
}

// ── Actions ───────────────────────────────────────────────────────────────────

function onClickCard(tpl: CardTemplate) {
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

function removeCardBySlot(slot: { type: string; cardId: string | null }) {
  if (!slot.cardId) return;
  const idx = playerStore.activeSquad.cardIds.indexOf(slot.cardId);
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
  battleStore.startCampaign(playerStore.activeSquad);
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
  gap: 14px;
  box-sizing: border-box;
}

/* ── Top Row ─────────────────────────────────────────────────────────────── */
.top-row {
  display: flex;
  flex-direction: row;
  gap: 12px;
  flex: 0 0 auto;
}

/* A · Squad list */
.squad-list {
  flex: 0 0 80px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  align-items: center;
}

.pane-label {
  font-size: 9px;
  font-weight: 800;
  color: #4b5563;
  letter-spacing: 1.5px;
  text-transform: uppercase;
  margin-bottom: 2px;
}

.squad-entries {
  display: flex;
  flex-direction: column;
  gap: 5px;
  width: 100%;
}

.squad-thumb {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  padding: 6px 4px;
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
.squad-thumb-icon { font-size: 1.2rem; }
.squad-thumb-num  { font-size: 9px; color: #6b7280; }

.btn-add-squad {
  margin-top: 2px;
  width: 100%;
  padding: 4px;
  border: 1px dashed #334155;
  border-radius: 6px;
  background: transparent;
  color: #4b5563;
  font-size: 1rem;
  cursor: pointer;
  transition: color 0.15s, border-color 0.15s;
}
.btn-add-squad:hover { color: #94a3b8; border-color: #475569; }

/* B/C · Hero details */
.hero-details {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  background: rgba(255,255,255,0.03);
  border: 1px solid #1e293b;
  border-radius: 10px;
  min-height: 160px;
}

.hero-header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.faction-badge {
  font-size: 9px;
  font-weight: 800;
  padding: 2px 6px;
  border-radius: 4px;
  letter-spacing: 0.5px;
}
.faction--red     { background: rgba(153,27,27,0.4);  color: #fca5a5; }
.faction--blue    { background: rgba(30,58,138,0.4);  color: #93c5fd; }
.faction--green   { background: rgba(6,78,59,0.4);    color: #6ee7b7; }
.faction--neutral { background: rgba(55,65,81,0.4);   color: #9ca3af; }

.hero-name { font-size: 15px; font-weight: 700; color: #f1f5f9; }

.hero-stats {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}
.stat-chip {
  font-size: 11px;
  color: #94a3b8;
  background: rgba(255,255,255,0.05);
  padding: 2px 7px;
  border-radius: 12px;
  border: 1px solid #1e293b;
}

.quota-row {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}
.quota-tag {
  font-size: 11px;
  font-weight: 700;
  padding: 3px 8px;
  border-radius: 6px;
}
.quota--creature { background: rgba(37,99,235,0.18);  color: #93c5fd; border: 1px solid #1e40af; }
.quota--artifact { background: rgba(180,83,9,0.18);   color: #fde68a; border: 1px solid #92400e; }
.quota--spell    { background: rgba(5,150,105,0.18);  color: #6ee7b7; border: 1px solid #065f46; }

.hero-actions {
  display: flex;
  gap: 6px;
  margin-top: auto;
}

.btn-secondary {
  padding: 5px 12px;
  border: 1px solid #334155;
  border-radius: 6px;
  background: transparent;
  color: #94a3b8;
  font-size: 11px;
  cursor: pointer;
  transition: border-color 0.15s, color 0.15s;
}
.btn-secondary:hover { border-color: #60a5fa; color: #bfdbfe; }

.btn-danger {
  padding: 5px 12px;
  border: 1px solid #7f1d1d;
  border-radius: 6px;
  background: transparent;
  color: #f87171;
  font-size: 11px;
  cursor: pointer;
  transition: background 0.15s;
}
.btn-danger:hover:not(:disabled) { background: rgba(239,68,68,0.12); }
.btn-danger:disabled { opacity: 0.3; cursor: not-allowed; }

.hero-empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  color: #374151;
  text-align: center;
}
.hero-empty-icon { font-size: 1.8rem; opacity: 0.4; }
.hero-empty p { font-size: 12px; margin: 0; }
.hero-empty-hint { font-size: 10px; color: #4b5563; }

/* ── D · Squad slot grid ─────────────────────────────────────────────────── */
.slot-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-height: 0;
}

.slot-section-header {
  display: flex;
  align-items: center;
  gap: 10px;
}
.slot-count       { font-size: 11px; color: #6b7280; font-weight: 600; }
.slot-count--full { color: #f87171; }

.slot-grid {
  flex: 1;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  grid-template-rows: repeat(2, 1fr);
  gap: 8px;
  min-height: 0;
}

.squad-slot {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 8px 6px;
  border-radius: 8px;
  border: 1px dashed #334155;
  transition: border-color 0.15s, background 0.15s;
  position: relative;
  min-height: 64px;
  text-align: center;
}

/* Type-tinted empty slots */
.squad-slot--creature { border-color: #1e40af; background: rgba(37,99,235,0.05); }
.squad-slot--artifact { border-color: #92400e; background: rgba(180,83,9,0.05); }
.squad-slot--spell    { border-color: #065f46; background: rgba(5,150,105,0.05); }

/* Filled slots */
.squad-slot--filled { border-style: solid; cursor: pointer; }
.squad-slot--filled.squad-slot--creature { border-color: #2563eb; background: rgba(37,99,235,0.1); }
.squad-slot--filled.squad-slot--artifact { border-color: #b45309; background: rgba(180,83,9,0.1); }
.squad-slot--filled.squad-slot--spell    { border-color: #059669; background: rgba(5,150,105,0.1); }
.squad-slot--filled:hover { background: rgba(239,68,68,0.12) !important; border-color: #ef4444 !important; }
.squad-slot--filled:hover .slot-remove { opacity: 1; }

/* Slot content */
.slot-type-tag {
  font-size: 9px;
  padding: 1px 5px;
  border-radius: 3px;
  background: rgba(255,255,255,0.08);
  font-weight: 700;
}
.type--creature { color: #93c5fd; }
.type--artifact { color: #fde68a; }
.type--spell    { color: #6ee7b7; }

.slot-card-name { font-size: 11px; color: #d1d5db; font-weight: 600; max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.slot-remove    { font-size: 10px; color: #f87171; opacity: 0; transition: opacity 0.12s; }

.slot-ph-icon  { font-size: 1.4rem; opacity: 0.25; }
.slot-ph-label { font-size: 10px; color: #374151; }

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
   RIGHT PANE
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
