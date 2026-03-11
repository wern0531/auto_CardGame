import { GameEngine } from './engine/GameEngine';
import type { CardTemplate, DeckDefinition } from '@auto-battle/shared';

// Load static card templates (relative to server/src/)
// eslint-disable-next-line @typescript-eslint/no-var-requires
const cardTemplates: CardTemplate[] = require('../../shared/templates/cards.json');

const engine = new GameEngine(cardTemplates);

// ─── Deck Setup ───────────────────────────────────────────────────────────────
// hero_red_001 has deckLimit: 5 → 1 hero + 5 cards = 6 total

// Player1: Frost Warden (hero_blue_001, deckLimit:9) — full 10-card deck
const deck1: DeckDefinition = {
  ownerId: 'Player1',
  heroCardId: 'hero_blue_001',
  cardIds: [
    'creature_red_001',     // Fire Imp      (5hp  3atk cd1)
    'creature_red_002',     // Shadow Blade  (3hp  6atk cd0) ← fast!
    'creature_blue_001',    // Frost Archer  (4hp  2atk cd1)
    'creature_blue_002',    // Venom Stalker (5hp  2atk cd1)
    'creature_green_001',   // Iron Golem    (14hp 2atk cd2) ← slow tank
    'artifact_neutral_001', // Iron Shield   (+5hp cd1)
    'artifact_neutral_002', // Power Gem     (+3atk cd1)
    'spell_red_001',        // Fireball      (cd2)
    'spell_blue_001',       // Healing Rain  (cd2)
  ],
};

// Player2: Blaze Commander (hero_red_001, deckLimit:5) — focused aggro deck
const deck2: DeckDefinition = {
  ownerId: 'Player2',
  heroCardId: 'hero_red_001',
  cardIds: [
    'creature_red_001',     // Fire Imp
    'creature_red_002',     // Shadow Blade
    'creature_green_001',   // Iron Golem
    'artifact_neutral_002', // Power Gem
    'spell_red_001',        // Fireball
  ],
};

// ─── Battle ───────────────────────────────────────────────────────────────────

let state = engine.initBattle(deck1, deck2);

console.log('╔══════════════════════════════════════╗');
console.log('║        AUTO BATTLE – SIMULATION      ║');
console.log('╚══════════════════════════════════════╝');
console.log(`P1 deck: ${state.players['Player1'].deck.length} cards`);
console.log(`P2 deck: ${state.players['Player2'].deck.length} cards`);
console.log('');

const MAX_TURNS = 30;
let prevLogLen  = 0;

while (!state.isOver && state.turn <= MAX_TURNS) {
  const turnLabel = `Turn ${state.turn} – ${state.activePlayerId}`;
  console.log(`┌─ ${turnLabel} ${'─'.repeat(Math.max(0, 38 - turnLabel.length))}┐`);

  state = engine.executeTurn(state);

  // Print only the new log entries produced this call
  const newEntries = state.log.slice(prevLogLen);
  prevLogLen = state.log.length;
  for (const entry of newEntries) {
    console.log(`  ${entry.message}`);
  }

  const p1 = state.players['Player1'];
  const p2 = state.players['Player2'];

  const fieldStr = (pid: string) => {
    const p = state.players[pid];
    if (p.field.length === 0) return '(empty)';
    return p.field
      .map(f => f ? `${f.cardId}[${f.currentStats.hp}/${f.currentStats.maxHp}hp ${f.currentStats.attack}atk]${f.equippedArtifact ? '⚔' : ''}` : '[ ]')
      .join('  ');
  };

  console.log(`  ── P1 hp:${p1.hp}  field: ${fieldStr('Player1')}`);
  console.log(`  ── P2 hp:${p2.hp}  field: ${fieldStr('Player2')}`);
  console.log('');
}

// ─── Result ───────────────────────────────────────────────────────────────────

if (state.isOver) {
  console.log(`╔══════════════════════════════════════╗`);
  console.log(`║  GAME OVER  →  Winner: ${state.winner!.padEnd(14)} ║`);
  console.log(`╚══════════════════════════════════════╝`);
} else {
  console.log(`⚠ Reached turn limit (${MAX_TURNS}) without a winner.`);
}

console.log(`\nTotal log entries: ${state.log.length}`);
