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

export const usePlayerStore = defineStore('player', () => {

  // ── State ───────────────────────────────────────────────────────────────────

  /** Full card library (every template = player owns it for testing). */
  const collection = ref<CardTemplate[]>(allTemplates);

  /** All saved squads. Starts empty to simulate new-player state. */
  const squads = ref<DeckDefinition[]>([]);

  /** Index of the squad currently being edited. -1 = none selected. */
  const activeSquadIndex = ref(-1);

  // ── Computed ────────────────────────────────────────────────────────────────

  const activeSquad = computed<DeckDefinition | undefined>(
    () => squads.value[activeSquadIndex.value],
  );

  const heroTemplate = computed<HeroCard | null>(() => {
    const heroId = activeSquad.value?.heroCardId;
    if (!heroId) return null;
    return (allTemplates.find(t => t.cardId === heroId && t.type === 'hero') as HeroCard) ?? null;
  });

  // ── Squad management ────────────────────────────────────────────────────────

  function setActiveSquad(idx: number) {
    if (idx >= 0 && idx < squads.value.length) {
      activeSquadIndex.value = idx;
    }
  }

  function createNewSquad() {
    squads.value.push(emptyDeck());
    activeSquadIndex.value = squads.value.length - 1;
  }

  function deleteSquad(idx: number) {
    squads.value.splice(idx, 1);
    if (squads.value.length === 0) {
      activeSquadIndex.value = -1;
    } else if (activeSquadIndex.value >= squads.value.length) {
      activeSquadIndex.value = squads.value.length - 1;
    }
  }

  // ── Deck editing ────────────────────────────────────────────────────────────

  /** Select a hero. Resets cardIds because squadSlots may differ. */
  function setHero(cardId: string) {
    const squad = activeSquad.value;
    if (!squad) return;
    squad.heroCardId = cardId;
    squad.cardIds    = [];
  }

  /** Add a non-hero card. Returns {ok, reason} so the UI can surface errors. */
  function addCardToDeck(cardId: string): { ok: boolean; reason?: string } {
    const squad = activeSquad.value;
    if (!squad)
      return { ok: false, reason: '請先選擇牌組' };

    if (!squad.heroCardId)
      return { ok: false, reason: '請先選擇主將' };

    const hero = heroTemplate.value;
    if (!hero)
      return { ok: false, reason: '主將資料異常' };

    if (squad.cardIds.length >= TOTAL_SLOTS)
      return { ok: false, reason: `隊伍已滿（${TOTAL_SLOTS} 張）` };

    const tpl = allTemplates.find(t => t.cardId === cardId);
    if (!tpl || tpl.type === 'hero')
      return { ok: false, reason: '無效卡片' };

    const cardType = tpl.type as 'creature' | 'artifact' | 'spell';
    const slotLimit = hero.squadSlots[cardType];
    const currentOfType = squad.cardIds.filter(id => {
      const t = allTemplates.find(x => x.cardId === id);
      return t?.type === cardType;
    }).length;

    if (currentOfType >= slotLimit) {
      console.warn(`[PlayerStore] ${cardType} slot full (${currentOfType}/${slotLimit})`);
      return { ok: false, reason: `${typeLabel(cardType)} 槽位已滿（${currentOfType}/${slotLimit}）` };
    }

    const copies = squad.cardIds.filter(id => id === cardId).length;
    if (copies >= MAX_COPIES)
      return { ok: false, reason: `同名卡片最多放 ${MAX_COPIES} 張` };

    squad.cardIds.push(cardId);
    return { ok: true };
  }

  /** Remove card at deck index. */
  function removeCardFromDeck(index: number) {
    activeSquad.value?.cardIds.splice(index, 1);
  }

  /** True when the squad has a hero and at least one non-hero card. */
  function isDeckValid(): boolean {
    const squad = activeSquad.value;
    return !!squad?.heroCardId && (squad.cardIds.length ?? 0) >= 1;
  }

  return {
    collection,
    squads,
    activeSquadIndex,
    activeSquad,
    heroTemplate,
    setActiveSquad,
    createNewSquad,
    deleteSquad,
    setHero,
    addCardToDeck,
    removeCardFromDeck,
    isDeckValid,
  };
});

function typeLabel(type: string): string {
  const map: Record<string, string> = { creature: 'Creature', artifact: 'Artifact', spell: 'Spell' };
  return map[type] ?? type;
}
