import { v4 as uuidv4 } from 'uuid';
import {
  BattleState,
  BattleLogEntry,
  CardInstance,
  CardTemplate,
  ArtifactCard,
  SpellCard,
  DeckDefinition,
  PlayerState,
  StatusEffectInstance,
} from '@auto-battle/shared';
import { GamePhase, SkillEffect, StatusEffect } from '@auto-battle/shared';

const MAX_FIELD_SIZE = 6;

// ─── helpers ──────────────────────────────────────────────────────────────────

function buildInstance(template: CardTemplate, ownerId: string): CardInstance {
  let hp = 0, attack = 0, cooldown = 0;

  if (template.type === 'hero' || template.type === 'creature') {
    hp       = template.baseStats.hp;
    attack   = template.baseStats.attack;
    cooldown = template.baseStats.cooldown;
  } else if (template.type === 'artifact') {
    cooldown = (template as ArtifactCard).baseStats.cooldown;
  } else if (template.type === 'spell') {
    cooldown = (template as SpellCard).cooldown;
  }

  return {
    instanceId:    uuidv4(),
    cardId:        template.cardId,
    ownerId,
    type:          template.type,
    currentZone:   'deck',
    position:      0,
    currentStats:  { hp, maxHp: hp, attack, cooldown },
    activeStatuses: [],
  };
}

function appendLog(
  state: BattleState,
  phase: GamePhase,
  entry: Omit<BattleLogEntry, 'turn' | 'phase'>,
): BattleState {
  return {
    ...state,
    log: [...state.log, { turn: state.turn, phase, ...entry }],
  };
}

function checkWin(state: BattleState): BattleState {
  for (const [id, player] of Object.entries(state.players)) {
    if (player.hp <= 0) {
      const winner = Object.keys(state.players).find(p => p !== id)!;
      return { ...state, winner, isOver: true };
    }
  }
  return state;
}

function enemyId(state: BattleState): string {
  return Object.keys(state.players).find(id => id !== state.activePlayerId)!;
}

// ─── GameEngine ───────────────────────────────────────────────────────────────

export class GameEngine {
  private readonly templates: Record<string, CardTemplate>;

  constructor(templates: CardTemplate[]) {
    this.templates = Object.fromEntries(templates.map(t => [t.cardId, t]));
  }

  // ── Public API ──────────────────────────────────────────────────────────────

  initBattle(deck1: DeckDefinition, deck2: DeckDefinition): BattleState {
    return {
      battleId:       uuidv4(),
      turn:           1,
      activePlayerId: deck1.ownerId,
      players: {
        [deck1.ownerId]: this.buildPlayer(deck1),
        [deck2.ownerId]: this.buildPlayer(deck2),
      },
      phase:   GamePhase.DRAW,
      log:     [],
      winner:  null,
      isOver:  false,
    };
  }

  /** Executes one full turn (all 5 phases) for the current active player. */
  executeTurn(state: BattleState): BattleState {
    if (state.isOver) return state;

    let s = state;
    s = this.phaseDraw(s);       if (s.isOver) return s;
    s = this.phaseCooldown(s);   if (s.isOver) return s;
    s = this.phaseDeployment(s); if (s.isOver) return s;
    s = this.phaseAction(s);     if (s.isOver) return s;
    s = this.phaseResolution(s); if (s.isOver) return s;

    // Advance turn counter & swap active player
    const ids     = Object.keys(s.players);
    const nextIdx = (ids.indexOf(s.activePlayerId) + 1) % ids.length;
    const isNewRound = nextIdx === 0;

    return {
      ...s,
      turn:           isNewRound ? s.turn + 1 : s.turn,
      activePlayerId: ids[nextIdx],
    };
  }

  // ── Initialisation ──────────────────────────────────────────────────────────

  private buildPlayer(deck: DeckDefinition): PlayerState {
    const cardIds = [deck.heroCardId, ...deck.cardIds];
    const instances = cardIds.map(id => {
      const template = this.templates[id];
      if (!template) throw new Error(`Unknown cardId: ${id}`);
      return buildInstance(template, deck.ownerId);
    });

    return {
      playerId:    deck.ownerId,
      displayName: deck.ownerId,
      hp:          30,
      deck:        instances,
      hand:        [],
      field:       [],
      graveyard:   [],
    };
  }

  // ── Phase 1: DRAW ───────────────────────────────────────────────────────────

  private phaseDraw(state: BattleState): BattleState {
    let s = { ...state, phase: GamePhase.DRAW };
    const ap = { ...s.players[s.activePlayerId] };

    if (ap.deck.length === 0) {
      return appendLog(s, GamePhase.DRAW, {
        actorId: null, targetId: null, effect: null, value: 0,
        message: `[DRAW] ${s.activePlayerId} deck is empty – skipped`,
      });
    }

    const [drawn, ...rest] = ap.deck;
    const card = { ...drawn, currentZone: 'hand' as const };
    ap.deck = rest;
    ap.hand = [...ap.hand, card];

    s = { ...s, players: { ...s.players, [s.activePlayerId]: ap } };
    return appendLog(s, GamePhase.DRAW, {
      actorId: card.instanceId, targetId: null, effect: null, value: 0,
      message: `[DRAW] ${s.activePlayerId} draws "${card.cardId}"`,
    });
  }

  // ── Phase 2: COOLDOWN ───────────────────────────────────────────────────────

  private phaseCooldown(state: BattleState): BattleState {
    let s = { ...state, phase: GamePhase.COOLDOWN };
    const ap = { ...s.players[s.activePlayerId] };

    ap.hand = ap.hand.map(c => ({
      ...c,
      currentStats: {
        ...c.currentStats,
        cooldown: Math.max(0, c.currentStats.cooldown - 1),
      },
    }));

    s = { ...s, players: { ...s.players, [s.activePlayerId]: ap } };
    return appendLog(s, GamePhase.COOLDOWN, {
      actorId: null, targetId: null, effect: null, value: 0,
      message: `[COOLDOWN] ${s.activePlayerId} hand ticked – ${ap.hand.map(c => `${c.cardId}(cd:${c.currentStats.cooldown})`).join(', ') || 'empty'}`,
    });
  }

  // ── Phase 3: DEPLOYMENT ─────────────────────────────────────────────────────

  private phaseDeployment(state: BattleState): BattleState {
    let s = { ...state, phase: GamePhase.DEPLOYMENT };
    const ap = { ...s.players[s.activePlayerId] };

    const pending: CardInstance[] = [];

    for (const card of ap.hand) {
      if (card.currentStats.cooldown > 0) {
        pending.push(card);
        continue;
      }

      if (card.type === 'hero' || card.type === 'creature') {
        // field is compact after left-shift, but count non-nulls defensively
        const unitCount = ap.field.filter(f => f !== null).length;
        if (unitCount >= MAX_FIELD_SIZE) {
          pending.push(card); // field full, stay in hand
          continue;
        }
        const pos      = ap.field.length; // compact → length = next index
        const deployed = { ...card, currentZone: 'field' as const, position: pos };
        ap.field = [...ap.field, deployed];

        s = appendLog(s, GamePhase.DEPLOYMENT, {
          actorId: deployed.instanceId, targetId: null, effect: 'deploy', value: 0,
          message: `[DEPLOY] "${card.cardId}" enters field at position ${pos}`,
        });

      } else if (card.type === 'artifact') {
        const targetIdx = ap.field.findIndex(
          f => f !== null && !f.equippedArtifact && (f.type === 'hero' || f.type === 'creature'),
        );

        if (targetIdx === -1) {
          // No eligible target – stay in hand, cooldown frozen at 0
          pending.push(card);
          continue;
        }

        const tpl    = this.templates[card.cardId] as ArtifactCard;
        const host   = ap.field[targetIdx] as CardInstance; // non-null: findIndex confirmed
        const artifact: CardInstance = { ...card, currentZone: 'field' as const, position: host.position };
        const buffed: CardInstance = {
          ...host,
          equippedArtifact: artifact,
          currentStats: {
            ...host.currentStats,
            hp:     host.currentStats.hp    + tpl.baseStats.hpBonus,
            maxHp:  host.currentStats.maxHp + tpl.baseStats.hpBonus,
            attack: host.currentStats.attack + tpl.baseStats.attackBonus,
          },
        };
        ap.field = ap.field.map((f, i) => i === targetIdx ? buffed : f);

        s = appendLog(s, GamePhase.DEPLOYMENT, {
          actorId: card.instanceId, targetId: host.instanceId, effect: 'deploy', value: 0,
          message: `[DEPLOY] Artifact "${card.cardId}" equipped on "${host.cardId}" (+${tpl.baseStats.hpBonus}hp +${tpl.baseStats.attackBonus}atk)`,
        });

      } else if (card.type === 'spell') {
        // Spell resolves immediately → graveyard (skill effects: TODO)
        const spent = { ...card, currentZone: 'graveyard' as const };
        ap.graveyard = [...ap.graveyard, spent];

        s = appendLog(s, GamePhase.DEPLOYMENT, {
          actorId: card.instanceId, targetId: null, effect: 'deploy', value: 0,
          message: `[DEPLOY] Spell "${card.cardId}" cast → graveyard`,
        });
      }
    }

    ap.hand = pending;
    s = { ...s, players: { ...s.players, [s.activePlayerId]: ap } };
    return s;
  }

  // ── Phase 4: ACTION ─────────────────────────────────────────────────────────

  private phaseAction(state: BattleState): BattleState {
    let s = { ...state, phase: GamePhase.ACTION };
    const eid = enemyId(s);
    const ap  = s.players[s.activePlayerId];
    let enemy = { ...s.players[eid] };

    for (let i = 0; i < ap.field.length; i++) {
      const attacker = ap.field[i];
      if (!attacker) continue; // skip null (empty) slots

      const dmg    = attacker.currentStats.attack;
      const target = enemy.field[i]; // CardInstance | null | undefined

      if (target) {
        // ── Normal attack ──────────────────────────────────────────────────
        const hit: CardInstance = {
          ...target,
          currentStats: { ...target.currentStats, hp: target.currentStats.hp - dmg },
        };

        s = appendLog(s, GamePhase.ACTION, {
          actorId: attacker.instanceId, targetId: target.instanceId,
          effect: 'attack', value: dmg,
          message: `[ACTION] "${attacker.cardId}" attacks "${target.cardId}" for ${dmg} dmg  (enemy hp: ${hit.currentStats.hp}/${hit.currentStats.maxHp})`,
        });

        if (hit.currentStats.hp <= 0) {
          // ── Instant death: slot → null, card → graveyard ─────────────────
          s = appendLog(s, GamePhase.ACTION, {
            actorId: null, targetId: target.instanceId, effect: 'death', value: 0,
            message: `[ACTION] "${target.cardId}" is destroyed`,
          });
          enemy = {
            ...enemy,
            graveyard: [
              ...enemy.graveyard,
              { ...hit, currentZone: 'graveyard' as const, equippedArtifact: undefined },
              ...(hit.equippedArtifact
                ? [{ ...hit.equippedArtifact, currentZone: 'graveyard' as const }]
                : []),
            ],
            field: enemy.field.map((f, idx) => idx === i ? null : f),
          };
        } else {
          enemy = {
            ...enemy,
            field: enemy.field.map((f, idx) => idx === i ? hit : f),
          };
        }

      } else {
        // ── Direct damage: null slot or beyond enemy field length ──────────
        enemy = { ...enemy, hp: enemy.hp - dmg };
        s = appendLog(s, GamePhase.ACTION, {
          actorId: attacker.instanceId, targetId: null,
          effect: 'direct_damage', value: dmg,
          message: `[ACTION] "${attacker.cardId}" deals ${dmg} DIRECT damage to ${eid}  (player hp: ${enemy.hp})`,
        });
      }
    }

    s = { ...s, players: { ...s.players, [s.activePlayerId]: ap, [eid]: enemy } };
    return checkWin(s);
  }

  // ── Phase 5: RESOLUTION ─────────────────────────────────────────────────────

  private phaseResolution(state: BattleState): BattleState {
    let s = { ...state, phase: GamePhase.RESOLUTION };

    for (const pid of Object.keys(s.players)) {
      let player = { ...s.players[pid] };

      // ── Step A: tick status effects; instant death → slot becomes null ─────
      const newField: (CardInstance | null)[] = [];

      for (const slot of player.field) {
        if (!slot) { newField.push(null); continue; } // propagate existing nulls

        let c = { ...slot };
        const remaining: StatusEffectInstance[] = [];

        for (const status of slot.activeStatuses) {
          if (status.type === StatusEffect.BURN || status.type === StatusEffect.POISON) {
            c = { ...c, currentStats: { ...c.currentStats, hp: c.currentStats.hp - status.value } };
            s = appendLog(s, GamePhase.RESOLUTION, {
              actorId: null, targetId: slot.instanceId,
              effect: status.type === StatusEffect.BURN ? SkillEffect.STATUS_BURN : SkillEffect.STATUS_POISON,
              value:   status.value,
              message: `[RESOLUTION] "${slot.cardId}" takes ${status.value} ${status.type} damage`,
            });
          }
          if (status.remainingTurns - 1 > 0) {
            remaining.push({ ...status, remainingTurns: status.remainingTurns - 1 });
          }
        }

        c = { ...c, activeStatuses: remaining };

        if (c.currentStats.hp <= 0) {
          // instant death from status damage
          s = appendLog(s, GamePhase.RESOLUTION, {
            actorId: null, targetId: c.instanceId, effect: 'death', value: 0,
            message: `[RESOLUTION] "${c.cardId}" is destroyed by status damage`,
          });
          player.graveyard = [
            ...player.graveyard,
            { ...c, currentZone: 'graveyard' as const, equippedArtifact: undefined },
            ...(c.equippedArtifact
              ? [{ ...c.equippedArtifact, currentZone: 'graveyard' as const }]
              : []),
          ];
          newField.push(null); // leave slot empty until left-shift
        } else {
          newField.push(c);
        }
      }

      player.field = newField;

      // ── Step B is removed: deaths are handled inline above ─────────────────

      // ── Step C: left-shift – filter nulls, reassign positions ──────────────
      player.field = (player.field.filter(f => f !== null) as CardInstance[])
        .map((card, idx) => ({ ...card, position: idx }));

      s = { ...s, players: { ...s.players, [pid]: player } };
    }

    return checkWin(s);
  }
}
