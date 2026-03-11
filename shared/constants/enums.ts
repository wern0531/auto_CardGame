export enum SkillTrigger {
  ON_ENTER = 'on_enter',
  ON_DEATH = 'on_death',
  ON_ATTACK = 'on_attack',
  ON_DAMAGED = 'on_damaged',
  ON_TURN_START = 'on_turn_start',
  ON_TURN_END = 'on_turn_end',
  ON_SPELL_CAST = 'on_spell_cast'
}

export enum SkillTarget {
  SELF = 'self',
  ENEMY_FRONT = 'enemy_front',
  ENEMY_HERO = 'enemy_hero',
  ENEMY_RANDOM = 'enemy_random',
  ENEMY_ALL = 'enemy_all',
  ALLY_RANDOM = 'ally_random',
  ALLY_ALL = 'ally_all'
}

export enum SkillEffect {
  DAMAGE = 'damage',
  HEAL = 'heal',
  BUFF_ATK = 'buff_atk',
  DEBUFF_ATK = 'debuff_atk',
  STATUS_FREEZE = 'status_freeze',
  STATUS_BURN = 'status_burn',
  STATUS_POISON = 'status_poison',
  STATUS_SHIELD = 'status_shield',
  INSTANT_KILL = 'instant_kill'
}

export enum CardZone {
  DECK = 'deck',
  HAND = 'hand',
  READY = 'ready',
  FIELD = 'field',
  GRAVEYARD = 'graveyard'
}

export enum GamePhase {
  DRAW = 'draw',
  COOLDOWN = 'cooldown',
  DEPLOYMENT = 'deployment',
  ACTION = 'action',
  RESOLUTION = 'resolution'
}

export enum StatusEffect {
  FREEZE = 'freeze',
  BURN = 'burn',
  POISON = 'poison',
  SHIELD = 'shield'
}
