import { SkillTrigger, SkillTarget, SkillEffect, StatusEffect, GamePhase } from '../constants/enums';

// ─── Skill Definition ────────────────────────────────────────────────────────

export interface SkillEffectEntry {
  effect: SkillEffect;
  value: number;           // damage/heal/buff amount, or duration for status effects
  target: SkillTarget;
  count?: number;          // repeat this effect N times (default 1)
}

export interface Skill {
  skillId: string;
  name: string;
  trigger: SkillTrigger;
  effects: SkillEffectEntry[];
}

// ─── Status Effect Instance ───────────────────────────────────────────────────

export interface StatusEffectInstance {
  type: StatusEffect;
  value: number;           // e.g. burn damage per turn
  remainingTurns: number;
}

// ─── Card Templates (Static Data) ─────────────────────────────────────────────

export interface BaseCard {
  cardId: string;
  name: string;
  faction: 'red' | 'blue' | 'green' | 'neutral';
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  description?: string;
}

export interface CreatureCard extends BaseCard {
  type: 'creature';
  baseStats: {
    hp: number;
    attack: number;
    cooldown: number;
  };
  skills: Skill[];
}

export interface HeroCard extends Omit<CreatureCard, 'type'> {
  type: 'hero';
  deckLimit: number; // number of non-hero slots this hero unlocks
}

export interface ArtifactCard extends BaseCard {
  type: 'artifact';
  baseStats: {
    hpBonus: number;
    attackBonus: number;
    cooldown: number;
  };
  skills: Skill[];
}

export interface SpellCard extends BaseCard {
  type: 'spell';
  cooldown: number;
  skills: Skill[];
}

export type CardTemplate = HeroCard | CreatureCard | ArtifactCard | SpellCard;

// ─── Card Instance (Runtime State) ────────────────────────────────────────────

export interface CardInstance {
  instanceId: string;
  cardId: string;
  ownerId: string;
  type: 'hero' | 'creature' | 'artifact' | 'spell';
  currentZone: 'deck' | 'hand' | 'ready' | 'field' | 'graveyard';
  position: number;
  currentStats: { hp: number; maxHp: number; attack: number; cooldown: number; };
  equippedArtifact?: CardInstance;
  activeStatuses: StatusEffectInstance[];
}

// ─── Player State ──────────────────────────────────────────────────────────────

export interface PlayerState {
  playerId: string;
  displayName: string;
  hp: number;                    // starts at 30
  deck: CardInstance[];
  hand: CardInstance[];          // cards waiting to deploy (ready zone)
  field: (CardInstance | null)[]; // null = empty slot (card just died, before left-shift)
  graveyard: CardInstance[];
}

// ─── Battle State ─────────────────────────────────────────────────────────────

export interface BattleState {
  battleId: string;
  turn: number;
  activePlayerId: string;
  players: Record<string, PlayerState>; // key: playerId
  phase: GamePhase;
  log: BattleLogEntry[];
  winner: string | null;
  isOver: boolean;
}

// ─── Battle Log ───────────────────────────────────────────────────────────────

export interface BattleLogEntry {
  turn: number;
  phase: GamePhase;
  actorId: string | null;       // instanceId of card acting, or null for system events
  targetId: string | null;
  effect: SkillEffect | 'attack' | 'deploy' | 'death' | 'direct_damage' | null;
  value: number;
  message: string;
}

// ─── Deck Definition (used for match setup) ───────────────────────────────────

export interface DeckDefinition {
  ownerId: string;
  heroCardId: string;
  cardIds: string[];             // non-hero card IDs, length must equal hero.deckLimit
}
