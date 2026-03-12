import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { CardTemplate, DeckDefinition, HeroCard } from '@auto-battle/shared';
import cardData from '../../../shared/templates/cards.json';

const allTemplates = cardData as CardTemplate[];

/** Max copies of the same non-hero card allowed in one squad. */
const MAX_COPIES = 2;

/** Total non-hero card slots per squad (always 6). */
const TOTAL_SLOTS = 6;

function emptyDeck(): DeckDefinition {
  return { ownerId: 'Player1', heroCardId: '', cardIds: [] };
}

function deepCopy(deck: DeckDefinition): DeckDefinition {
  return JSON.parse(JSON.stringify(deck));
}

export const usePlayerStore = defineStore('player', () => {

  // ── State ───────────────────────────────────────────────────────────────────

  /** Full card library (every template = player owns it for testing). */
  const collection = ref<CardTemplate[]>(allTemplates);

  /** All saved squads. */
  const squads = ref<DeckDefinition[]>([]);

  /**
   * Index of the saved squad being edited. -1 means a brand-new unsaved squad.
   * Never read this directly for card data — use draftSquad instead.
   */
  const activeSquadIndex = ref(-1);

  /**
   * The working copy players edit. All card mutations target this object.
   * null = no draft open yet (before onMounted initialises one).
   */
  const draftSquad = ref<DeckDefinition | null>(null);

  // ── Computed ────────────────────────────────────────────────────────────────

  /** Hero template derived from the current draft, not the saved array. */
  const heroTemplate = computed<HeroCard | null>(() => {
    const heroId = draftSquad.value?.heroCardId;
    if (!heroId) return null;
    return (allTemplates.find(t => t.cardId === heroId && t.type === 'hero') as HeroCard) ?? null;
  });

  // ── Squad management ────────────────────────────────────────────────────────

  /**
   * Select a saved squad for editing.
   * Deep-copies the saved data into draftSquad so edits never pollute the array.
   */
  function selectSquad(index: number) {
    if (index < 0 || index >= squads.value.length) return;
    activeSquadIndex.value = index;
    draftSquad.value = deepCopy(squads.value[index]);
  }

  /**
   * Open a blank draft for a brand-new squad.
   * Does NOT push anything to the squads array yet.
   */
  function createNewSquad() {
    activeSquadIndex.value = -1;
    draftSquad.value = emptyDeck();
  }

  /**
   * Delete a saved squad.
   * After deletion, auto-selects an adjacent saved squad or opens a new draft.
   */
  function deleteSquad(idx: number) {
    squads.value.splice(idx, 1);
    if (squads.value.length === 0) {
      activeSquadIndex.value = -1;
      draftSquad.value = emptyDeck();
    } else {
      selectSquad(Math.min(idx, squads.value.length - 1));
    }
  }

  // ── Draft editing ────────────────────────────────────────────────────────────

  /** Select a hero for the draft. Resets cardIds because squadSlots may differ. */
  function setHero(cardId: string) {
    if (!draftSquad.value) return;
    draftSquad.value.heroCardId = cardId;
    draftSquad.value.cardIds    = [];
  }

  /** Add a non-hero card to the draft. Returns {ok, reason} for UI feedback. */
  function addCardToDeck(cardId: string): { ok: boolean; reason?: string } {
    const draft = draftSquad.value;
    if (!draft)
      return { ok: false, reason: '請先選擇牌組' };

    if (!draft.heroCardId)
      return { ok: false, reason: '請先選擇主將' };

    const hero = heroTemplate.value;
    if (!hero)
      return { ok: false, reason: '主將資料異常' };

    if (draft.cardIds.length >= TOTAL_SLOTS)
      return { ok: false, reason: `隊伍已滿（${TOTAL_SLOTS} 張）` };

    const tpl = allTemplates.find(t => t.cardId === cardId);
    if (!tpl || tpl.type === 'hero')
      return { ok: false, reason: '無效卡片' };

    const cardType = tpl.type as 'creature' | 'artifact' | 'spell';
    const slotLimit = hero.squadSlots[cardType];
    const currentOfType = draft.cardIds.filter(id => {
      const t = allTemplates.find(x => x.cardId === id);
      return t?.type === cardType;
    }).length;

    if (currentOfType >= slotLimit) {
      console.warn(`[PlayerStore] ${cardType} slot full (${currentOfType}/${slotLimit})`);
      return { ok: false, reason: `${typeLabel(cardType)} 槽位已滿（${currentOfType}/${slotLimit}）` };
    }

    const copies = draft.cardIds.filter(id => id === cardId).length;
    if (copies >= MAX_COPIES)
      return { ok: false, reason: `同名卡片最多放 ${MAX_COPIES} 張` };

    draft.cardIds.push(cardId);
    return { ok: true };
  }

  /** Remove a card from the draft by index. */
  function removeCardFromDeck(index: number) {
    draftSquad.value?.cardIds.splice(index, 1);
  }

  /** Clear the draft content (hero + all cards) without closing the draft. */
  function clearDraft() {
    if (!draftSquad.value) return;
    draftSquad.value.heroCardId = '';
    draftSquad.value.cardIds    = [];
  }

  /**
   * Persist the current draft back to the squads array.
   * - activeSquadIndex === -1 → new squad, push to array and update index.
   * - activeSquadIndex >= 0   → overwrite the existing saved entry.
   */
  function saveSquad() {
    if (!draftSquad.value) return;
    if (activeSquadIndex.value === -1) {
      squads.value.push(deepCopy(draftSquad.value));
      activeSquadIndex.value = squads.value.length - 1;
    } else {
      squads.value[activeSquadIndex.value] = deepCopy(draftSquad.value);
    }
  }

  /** True when the draft has a hero and at least one non-hero card. */
  function isDeckValid(): boolean {
    const draft = draftSquad.value;
    return !!draft?.heroCardId && (draft.cardIds.length ?? 0) >= 1;
  }

  return {
    collection,
    squads,
    activeSquadIndex,
    draftSquad,
    heroTemplate,
    selectSquad,
    createNewSquad,
    deleteSquad,
    setHero,
    addCardToDeck,
    removeCardFromDeck,
    clearDraft,
    saveSquad,
    isDeckValid,
  };
});

function typeLabel(type: string): string {
  const map: Record<string, string> = { creature: 'Creature', artifact: 'Artifact', spell: 'Spell' };
  return map[type] ?? type;
}
