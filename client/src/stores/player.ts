import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { CardTemplate, DeckDefinition, HeroCard } from '@auto-battle/shared';
import cardData from '../../../shared/templates/cards.json';

const allTemplates = cardData as CardTemplate[];

/** Max copies of the same non-hero card allowed in one deck. */
const MAX_COPIES = 2;

export const usePlayerStore = defineStore('player', () => {

  // ── State ───────────────────────────────────────────────────────────────────

  /** Full card library – every template == player "owns" it (testing convenience). */
  const collection = ref<CardTemplate[]>(allTemplates);

  /** The deck currently being assembled. */
  const currentDeck = ref<DeckDefinition>({
    ownerId: 'Player1',
    heroCardId: '',
    cardIds: [],
  });

  // ── Computed ────────────────────────────────────────────────────────────────

  const heroTemplate = computed<HeroCard | null>(() => {
    if (!currentDeck.value.heroCardId) return null;
    return (
      (allTemplates.find(
        t => t.cardId === currentDeck.value.heroCardId && t.type === 'hero',
      ) as HeroCard) ?? null
    );
  });

  const deckLimit = computed(() => heroTemplate.value?.deckLimit ?? 0);

  // ── Actions ─────────────────────────────────────────────────────────────────

  /** Select a hero. Resets cardIds because deckLimit may differ. */
  function setHero(cardId: string) {
    currentDeck.value.heroCardId = cardId;
    currentDeck.value.cardIds    = [];
  }

  /** Add a non-hero card. Returns {ok, reason} so the UI can surface errors. */
  function addCardToDeck(cardId: string): { ok: boolean; reason?: string } {
    if (!currentDeck.value.heroCardId)
      return { ok: false, reason: '請先選擇主將' };

    if (currentDeck.value.cardIds.length >= deckLimit.value)
      return { ok: false, reason: `已達上限（${deckLimit.value} 張）` };

    const copies = currentDeck.value.cardIds.filter(id => id === cardId).length;
    if (copies >= MAX_COPIES)
      return { ok: false, reason: `同名卡片最多放 ${MAX_COPIES} 張` };

    currentDeck.value.cardIds.push(cardId);
    return { ok: true };
  }

  /** Remove card at deck index. */
  function removeCardFromDeck(index: number) {
    currentDeck.value.cardIds.splice(index, 1);
  }

  /** True when the deck has a hero and at least one non-hero card. */
  function isDeckValid(): boolean {
    return (
      !!currentDeck.value.heroCardId &&
      currentDeck.value.cardIds.length >= 1 &&
      currentDeck.value.cardIds.length <= deckLimit.value
    );
  }

  return {
    collection,
    currentDeck,
    heroTemplate,
    deckLimit,
    setHero,
    addCardToDeck,
    removeCardFromDeck,
    isDeckValid,
  };
});
