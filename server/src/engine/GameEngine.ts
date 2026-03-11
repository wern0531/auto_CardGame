import { v4 as uuidv4 } from 'uuid';
import {
  BattleState,
  BattleLogEntry,
  CardInstance,
  CardTemplate,
  ArtifactCard,
  DeckDefinition,
  PlayerState,
  StatusEffectInstance,
} from '@auto-battle/shared';
import {
  GamePhase,
  SkillEffect,
  SkillTarget,
  SkillTrigger,
  StatusEffect,
} from '@auto-battle/shared';

const MAX_FIELD_SIZE = 6;

// ═══════════════════════════════════════════════════════════════════════════════
// Module-level pure helpers
// ═══════════════════════════════════════════════════════════════════════════════

function buildInstance(template: CardTemplate, ownerId: string): CardInstance {
  let hp = 0, attack = 0;

  if (template.type === 'hero' || template.type === 'creature') {
    hp     = template.baseStats.hp;
    attack = template.baseStats.attack;
  }

  // All cards use a random cooldown of 3–7 (ignores template value)
  const cooldown = Math.floor(Math.random() * 5) + 3;

  return {
    instanceId:     uuidv4(),
    cardId:         template.cardId,
    ownerId,
    type:           template.type,
    currentZone:    'deck',
    position:       0,
    currentStats:   { hp, maxHp: hp, attack, cooldown },
    activeStatuses: [],
  };
}

function appendLog(
  state:  BattleState,
  phase:  GamePhase,
  entry:  Omit<BattleLogEntry, 'turn' | 'phase'>,
): BattleState {
  return { ...state, log: [...state.log, { turn: state.turn, phase, ...entry }] };
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

// ─── Skill-engine helpers ──────────────────────────────────────────────────────

/** Find a live card by instanceId on any player's field. */
function findCardInField(
  state:      BattleState,
  instanceId: string,
  ownerId:    string,
): CardInstance | null {
  return (
    state.players[ownerId]?.field.find(f => f?.instanceId === instanceId) ?? null
  );
}

/** Return a new state with one field card replaced (matched by instanceId). */
function updateCardOnField(state: BattleState, updated: CardInstance): BattleState {
  const pid = updated.ownerId;
  const p   = state.players[pid];
  return {
    ...state,
    players: {
      ...state.players,
      [pid]: {
        ...p,
        field: p.field.map(f => f?.instanceId === updated.instanceId ? updated : f),
      },
    },
  };
}

/**
 * Move a dead card (and its equipped artifact) from its field slot to graveyard.
 * The slot becomes null (not yet left-shifted).
 */
function killCard(state: BattleState, dead: CardInstance): BattleState {
  const pid = dead.ownerId;
  const p   = state.players[pid];
  return {
    ...state,
    players: {
      ...state.players,
      [pid]: {
        ...p,
        graveyard: [
          ...p.graveyard,
          { ...dead, currentZone: 'graveyard' as const, equippedArtifact: undefined },
          ...(dead.equippedArtifact
            ? [{ ...dead.equippedArtifact, currentZone: 'graveyard' as const }]
            : []),
        ],
        field: p.field.map(f => f?.instanceId === dead.instanceId ? null : f),
      },
    },
  };
}

/**
 * Resolve skill target enum → live CardInstance array from the CURRENT state.
 * Always called with the latest `s` so results are never stale.
 */
function resolveTargets(
  state:  BattleState,
  actor:  CardInstance,
  target: SkillTarget,
): CardInstance[] {
  const eid        = Object.keys(state.players).find(id => id !== actor.ownerId)!;
  const allyField  = state.players[actor.ownerId].field;
  const enemyField = state.players[eid].field;

  switch (target) {
    case SkillTarget.SELF: {
      const self = allyField.find(f => f?.instanceId === actor.instanceId) ?? null;
      return self ? [self] : [];
    }
    case SkillTarget.ALLY_ALL:
      return allyField.filter((f): f is CardInstance => f !== null);
    case SkillTarget.ALLY_RANDOM: {
      const pool = allyField.filter((f): f is CardInstance => f !== null);
      return pool.length ? [pool[Math.floor(Math.random() * pool.length)]] : [];
    }
    case SkillTarget.ENEMY_FRONT: {
      const front = enemyField[actor.position];
      return front ? [front] : [];
    }
    case SkillTarget.ENEMY_ALL:
      return enemyField.filter((f): f is CardInstance => f !== null);
    case SkillTarget.ENEMY_RANDOM: {
      const pool = enemyField.filter((f): f is CardInstance => f !== null);
      return pool.length ? [pool[Math.floor(Math.random() * pool.length)]] : [];
    }
    case SkillTarget.ENEMY_HERO: {
      const hero = enemyField.find(f => f !== null && f.type === 'hero');
      return hero ? [hero] : [];
    }
    default:
      return [];
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// GameEngine
// ═══════════════════════════════════════════════════════════════════════════════

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

    const ids        = Object.keys(s.players);
    const nextIdx    = (ids.indexOf(s.activePlayerId) + 1) % ids.length;
    const isNewRound = nextIdx === 0;

    return {
      ...s,
      turn:           isNewRound ? s.turn + 1 : s.turn,
      activePlayerId: ids[nextIdx],
    };
  }

  // ── Initialisation ──────────────────────────────────────────────────────────

  private buildPlayer(deck: DeckDefinition): PlayerState {
    const cardIds   = [deck.heroCardId, ...deck.cardIds];
    const instances = cardIds.map(id => {
      const template = this.templates[id];
      if (!template) throw new Error(`未知卡牌 ID：${id}`);
      return buildInstance(template, deck.ownerId);
    });

    // Full Fisher-Yates shuffle — no draw-order guarantee for hero
    for (let i = instances.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [instances[i], instances[j]] = [instances[j], instances[i]];
    }

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

  // ── Phase 1: 抽牌 ───────────────────────────────────────────────────────────

  private phaseDraw(state: BattleState): BattleState {
    let s  = { ...state, phase: GamePhase.DRAW };
    const ap = { ...s.players[s.activePlayerId] };

    if (ap.deck.length === 0) {
      return appendLog(s, GamePhase.DRAW, {
        actorId: null, targetId: null, effect: null, value: 0,
        message: `[抽牌] ${s.activePlayerId} 牌組已空，跳過`,
      });
    }

    const [drawn, ...rest] = ap.deck;
    const card = { ...drawn, currentZone: 'hand' as const };
    ap.deck = rest;
    ap.hand = [...ap.hand, card];

    s = { ...s, players: { ...s.players, [s.activePlayerId]: ap } };
    return appendLog(s, GamePhase.DRAW, {
      actorId: card.instanceId, targetId: null, effect: null, value: 0,
      message: `[抽牌] ${s.activePlayerId} 抽到「${card.cardId}」（冷卻：${card.currentStats.cooldown}）`,
    });
  }

  // ── Phase 2: 冷卻 ───────────────────────────────────────────────────────────

  private phaseCooldown(state: BattleState): BattleState {
    let s  = { ...state, phase: GamePhase.COOLDOWN };
    const ap = { ...s.players[s.activePlayerId] };

    ap.hand = ap.hand.map(c => ({
      ...c,
      currentStats: { ...c.currentStats, cooldown: Math.max(0, c.currentStats.cooldown - 1) },
    }));

    s = { ...s, players: { ...s.players, [s.activePlayerId]: ap } };
    return appendLog(s, GamePhase.COOLDOWN, {
      actorId: null, targetId: null, effect: null, value: 0,
      message: `[冷卻] ${s.activePlayerId} 手牌計時：${
        ap.hand.map(c => `${c.cardId}(${c.currentStats.cooldown})`).join('、') || '無'
      }`,
    });
  }

  // ── Phase 3: 進場 ───────────────────────────────────────────────────────────

  private phaseDeployment(state: BattleState): BattleState {
    let s = { ...state, phase: GamePhase.DEPLOYMENT };

    // Snapshot initial hand; track which cards stay (couldn't deploy)
    const cardsToProcess = [...s.players[s.activePlayerId].hand];
    const pendingIds      = new Set<string>();

    for (const card of cardsToProcess) {
      if (card.currentStats.cooldown > 0) {
        pendingIds.add(card.instanceId);
        continue;
      }

      // ── Hero / Creature ──────────────────────────────────────────────────
      if (card.type === 'hero' || card.type === 'creature') {
        const ap        = s.players[s.activePlayerId];
        const unitCount = ap.field.filter(f => f !== null).length;

        if (unitCount >= MAX_FIELD_SIZE) {
          pendingIds.add(card.instanceId);
          continue;
        }

        const pos      = ap.field.length;
        const deployed : CardInstance = { ...card, currentZone: 'field' as const, position: pos };

        // Write deployed card to s.field before calling ON_ENTER (skills need live state)
        s = {
          ...s,
          players: {
            ...s.players,
            [s.activePlayerId]: { ...ap, field: [...ap.field, deployed] },
          },
        };
        s = appendLog(s, GamePhase.DEPLOYMENT, {
          actorId: deployed.instanceId, targetId: null, effect: 'deploy', value: 0,
          message: `[進場] 「${card.cardId}」進入戰場，位置 ${pos}`,
        });

        // ← ON_ENTER skill hook ─────────────────────────────────────────────
        s = this.executeSkills(s, SkillTrigger.ON_ENTER, deployed);
        if (s.isOver) return s;

      // ── Artifact ────────────────────────────────────────────────────────
      } else if (card.type === 'artifact') {
        const ap        = s.players[s.activePlayerId];
        const targetIdx = ap.field.findIndex(
          f => f !== null && !f.equippedArtifact && (f.type === 'hero' || f.type === 'creature'),
        );

        if (targetIdx === -1) {
          pendingIds.add(card.instanceId); // stay in hand (cooldown frozen at 0)
          continue;
        }

        const tpl      = this.templates[card.cardId] as ArtifactCard;
        const host     = ap.field[targetIdx] as CardInstance;
        const artifact : CardInstance = { ...card, currentZone: 'field' as const, position: host.position };
        const buffed   : CardInstance = {
          ...host,
          equippedArtifact: artifact,
          currentStats: {
            ...host.currentStats,
            hp:     host.currentStats.hp    + tpl.baseStats.hpBonus,
            maxHp:  host.currentStats.maxHp + tpl.baseStats.hpBonus,
            attack: host.currentStats.attack + tpl.baseStats.attackBonus,
          },
        };

        s = {
          ...s,
          players: {
            ...s.players,
            [s.activePlayerId]: { ...ap, field: ap.field.map((f, i) => i === targetIdx ? buffed : f) },
          },
        };
        s = appendLog(s, GamePhase.DEPLOYMENT, {
          actorId: card.instanceId, targetId: host.instanceId, effect: 'deploy', value: 0,
          message: `[進場] 裝備「${card.cardId}」裝備到「${host.cardId}」（+${tpl.baseStats.hpBonus}血 +${tpl.baseStats.attackBonus}攻）`,
        });

      // ── Spell ────────────────────────────────────────────────────────────
      } else if (card.type === 'spell') {
        // ← ON_SPELL_CAST skill hook (fires BEFORE going to graveyard) ──────
        s = this.executeSkills(s, SkillTrigger.ON_SPELL_CAST, card);
        if (s.isOver) return s;

        const ap = s.players[s.activePlayerId];
        s = {
          ...s,
          players: {
            ...s.players,
            [s.activePlayerId]: {
              ...ap,
              graveyard: [...ap.graveyard, { ...card, currentZone: 'graveyard' as const }],
            },
          },
        };
        s = appendLog(s, GamePhase.DEPLOYMENT, {
          actorId: card.instanceId, targetId: null, effect: 'deploy', value: 0,
          message: `[進場] 法術「${card.cardId}」發動 → 墓地`,
        });
      }
    }

    // Finalise hand: keep only cards that couldn't deploy
    const finalAp = s.players[s.activePlayerId];
    s = {
      ...s,
      players: {
        ...s.players,
        [s.activePlayerId]: {
          ...finalAp,
          hand: cardsToProcess.filter(c => pendingIds.has(c.instanceId)),
        },
      },
    };
    return s;
  }

  // ── Phase 4: 行動 ───────────────────────────────────────────────────────────

  private phaseAction(state: BattleState): BattleState {
    let s   = { ...state, phase: GamePhase.ACTION };
    const eid       = enemyId(s);
    const initLen   = s.players[s.activePlayerId].field.length; // snapshot length

    for (let i = 0; i < initLen; i++) {
      // Always re-read attacker from current state
      const attacker = s.players[s.activePlayerId].field[i];
      if (!attacker) continue;

      // ← ON_ATTACK skill hook (fires BEFORE normal attack) ─────────────────
      s = this.executeSkills(s, SkillTrigger.ON_ATTACK, attacker);
      if (s.isOver) return s;

      // Re-read attacker & target after skill execution (skills may have changed state)
      const freshAttacker = s.players[s.activePlayerId].field[i];
      if (!freshAttacker) continue; // attacker was killed by its own skill

      const dmg    = freshAttacker.currentStats.attack;
      const target = s.players[eid].field[i]; // re-read from latest s

      if (target) {
        // ── Normal attack ────────────────────────────────────────────────
        const hit: CardInstance = {
          ...target,
          currentStats: { ...target.currentStats, hp: target.currentStats.hp - dmg },
        };

        s = appendLog(s, GamePhase.ACTION, {
          actorId: freshAttacker.instanceId, targetId: target.instanceId,
          effect: 'attack', value: dmg,
          message: `[行動] 「${freshAttacker.cardId}」攻擊「${target.cardId}」造成 ${dmg} 傷害（${hit.currentStats.hp}/${hit.currentStats.maxHp}）`,
        });

        if (hit.currentStats.hp <= 0) {
          s = appendLog(s, GamePhase.ACTION, {
            actorId: null, targetId: target.instanceId, effect: 'death', value: 0,
            message: `[行動] 「${target.cardId}」被消滅`,
          });
          s = killCard(s, hit);
        } else {
          s = updateCardOnField(s, hit);
        }

      } else {
        // ── Direct damage: null slot or beyond enemy field ───────────────
        const enemy = s.players[eid];
        s = { ...s, players: { ...s.players, [eid]: { ...enemy, hp: enemy.hp - dmg } } };
        s = appendLog(s, GamePhase.ACTION, {
          actorId: freshAttacker.instanceId, targetId: null,
          effect: 'direct_damage', value: dmg,
          message: `[行動] 「${freshAttacker.cardId}」直擊 ${eid} 造成 ${dmg} 傷害（玩家血量：${s.players[eid].hp}）`,
        });
      }

      s = checkWin(s);
      if (s.isOver) return s;
    }

    return s;
  }

  // ── Phase 5: 結算 ───────────────────────────────────────────────────────────

  private phaseResolution(state: BattleState): BattleState {
    let s = { ...state, phase: GamePhase.RESOLUTION };

    for (const pid of Object.keys(s.players)) {
      let player = { ...s.players[pid] };

      // Step A: tick status effects; instant death → slot becomes null
      const newField: (CardInstance | null)[] = [];

      for (const slot of player.field) {
        if (!slot) { newField.push(null); continue; }

        let c = { ...slot };
        const remaining: StatusEffectInstance[] = [];

        for (const status of slot.activeStatuses) {
          if (status.type === StatusEffect.BURN || status.type === StatusEffect.POISON) {
            c = { ...c, currentStats: { ...c.currentStats, hp: c.currentStats.hp - status.value } };
            s = appendLog(s, GamePhase.RESOLUTION, {
              actorId: null, targetId: slot.instanceId,
              effect: status.type === StatusEffect.BURN ? SkillEffect.STATUS_BURN : SkillEffect.STATUS_POISON,
              value:   status.value,
              message: `[結算] 「${slot.cardId}」受到 ${status.value} 點${status.type === StatusEffect.BURN ? '燃燒' : '毒素'}傷害`,
            });
          }
          if (status.remainingTurns - 1 > 0) {
            remaining.push({ ...status, remainingTurns: status.remainingTurns - 1 });
          }
        }

        c = { ...c, activeStatuses: remaining };

        if (c.currentStats.hp <= 0) {
          s = appendLog(s, GamePhase.RESOLUTION, {
            actorId: null, targetId: c.instanceId, effect: 'death', value: 0,
            message: `[結算] 「${c.cardId}」因持續效果死亡`,
          });
          player.graveyard = [
            ...player.graveyard,
            { ...c, currentZone: 'graveyard' as const, equippedArtifact: undefined },
            ...(c.equippedArtifact
              ? [{ ...c.equippedArtifact, currentZone: 'graveyard' as const }]
              : []),
          ];
          newField.push(null);
        } else {
          newField.push(c);
        }
      }

      player.field = newField;

      // Step C: left-shift – filter nulls, reassign positions
      player.field = (player.field.filter(f => f !== null) as CardInstance[])
        .map((card, idx) => ({ ...card, position: idx }));

      s = { ...s, players: { ...s.players, [pid]: player } };
    }

    return checkWin(s);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Skill Engine
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Execute all skills on `actor` that match `trigger`.
   * Fully immutable – every change returns a new BattleState.
   */
  private executeSkills(
    state:   BattleState,
    trigger: SkillTrigger,
    actor:   CardInstance,
  ): BattleState {
    const template = this.templates[actor.cardId];
    if (!template?.skills?.length) return state;

    const matched = template.skills.filter(sk => sk.trigger === trigger);
    if (!matched.length) return state;

    let s = state;

    for (const skill of matched) {
      for (const eff of skill.effects) {
        const loopCount = eff.count ?? 1;

        for (let ci = 0; ci < loopCount; ci++) {
          // Re-resolve each iteration so ENEMY_RANDOM re-randomises per hit
          const targetRefs = resolveTargets(s, actor, eff.target as SkillTarget);

          // ENEMY_RANDOM + DAMAGE with no field targets → direct damage to enemy player
          if (
            (eff.target as string) === SkillTarget.ENEMY_RANDOM &&
            (eff.effect  as string) === SkillEffect.DAMAGE &&
            targetRefs.length === 0
          ) {
            const eid   = Object.keys(s.players).find(id => id !== actor.ownerId)!;
            const enemy = s.players[eid];
            const newHp = Math.max(0, enemy.hp - eff.value);
            s = { ...s, players: { ...s.players, [eid]: { ...enemy, hp: newHp } } };
            s = appendLog(s, s.phase, {
              actorId: actor.instanceId, targetId: null,
              effect: 'direct_damage', value: eff.value,
              message: `[技能] 「${actor.cardId}」發動『${skill.name}』：直擊敵方玩家造成 ${eff.value} 點傷害（血量：${newHp}）`,
            });
            s = checkWin(s);
            if (s.isOver) return s;
            continue;
          }

          for (const ref of targetRefs) {
            // Re-fetch live version (a previous effect may have already killed this card)
            const live = findCardInField(s, ref.instanceId, ref.ownerId);
            if (!live) continue;

            switch (eff.effect as SkillEffect) {

            // ── Attack buff ───────────────────────────────────────────────
            case SkillEffect.BUFF_ATK: {
              const boosted = {
                ...live,
                currentStats: { ...live.currentStats, attack: live.currentStats.attack + eff.value },
              };
              s = updateCardOnField(s, boosted);
              s = appendLog(s, s.phase, {
                actorId: actor.instanceId, targetId: live.instanceId,
                effect: SkillEffect.BUFF_ATK, value: eff.value,
                message: `[技能] 「${actor.cardId}」發動『${skill.name}』：「${live.cardId}」攻擊力 +${eff.value}`,
              });
              break;
            }

            // ── Attack debuff ─────────────────────────────────────────────
            case SkillEffect.DEBUFF_ATK: {
              const debuffed = {
                ...live,
                currentStats: { ...live.currentStats, attack: Math.max(0, live.currentStats.attack - eff.value) },
              };
              s = updateCardOnField(s, debuffed);
              s = appendLog(s, s.phase, {
                actorId: actor.instanceId, targetId: live.instanceId,
                effect: SkillEffect.DEBUFF_ATK, value: eff.value,
                message: `[技能] 「${actor.cardId}」發動『${skill.name}』：「${live.cardId}」攻擊力 -${eff.value}`,
              });
              break;
            }

            // ── Direct damage ─────────────────────────────────────────────
            case SkillEffect.DAMAGE: {
              const newHp = live.currentStats.hp - eff.value;
              const hit   = { ...live, currentStats: { ...live.currentStats, hp: newHp } };
              s = appendLog(s, s.phase, {
                actorId: actor.instanceId, targetId: live.instanceId,
                effect: SkillEffect.DAMAGE, value: eff.value,
                message: `[技能] 「${actor.cardId}」發動『${skill.name}』：對「${live.cardId}」造成 ${eff.value} 點傷害`,
              });
              if (newHp <= 0) {
                s = appendLog(s, s.phase, {
                  actorId: null, targetId: live.instanceId, effect: 'death', value: 0,
                  message: `[技能] 「${live.cardId}」被技能擊殺`,
                });
                s = killCard(s, hit);
              } else {
                s = updateCardOnField(s, hit);
              }
              break;
            }

            // ── Heal ──────────────────────────────────────────────────────
            case SkillEffect.HEAL: {
              const healed  = Math.min(live.currentStats.maxHp, live.currentStats.hp + eff.value);
              const updated = { ...live, currentStats: { ...live.currentStats, hp: healed } };
              s = updateCardOnField(s, updated);
              s = appendLog(s, s.phase, {
                actorId: actor.instanceId, targetId: live.instanceId,
                effect: SkillEffect.HEAL, value: eff.value,
                message: `[技能] 「${actor.cardId}」發動『${skill.name}』：「${live.cardId}」回復 ${eff.value} 點血量`,
              });
              break;
            }

            // ── Status effects ────────────────────────────────────────────
            case SkillEffect.STATUS_BURN:
            case SkillEffect.STATUS_FREEZE:
            case SkillEffect.STATUS_POISON:
            case SkillEffect.STATUS_SHIELD: {
              const typeMap: Partial<Record<SkillEffect, StatusEffect>> = {
                [SkillEffect.STATUS_BURN]:   StatusEffect.BURN,
                [SkillEffect.STATUS_FREEZE]: StatusEffect.FREEZE,
                [SkillEffect.STATUS_POISON]: StatusEffect.POISON,
                [SkillEffect.STATUS_SHIELD]: StatusEffect.SHIELD,
              };
              const statusType = typeMap[eff.effect as SkillEffect]!;
              const newStatus: StatusEffectInstance = {
                type: statusType, value: eff.value, remainingTurns: 2,
              };
              // Refresh instead of stacking the same status type
              const updated = {
                ...live,
                activeStatuses: [
                  ...live.activeStatuses.filter(st => st.type !== statusType),
                  newStatus,
                ],
              };
              s = updateCardOnField(s, updated);
              s = appendLog(s, s.phase, {
                actorId: actor.instanceId, targetId: live.instanceId,
                effect: eff.effect as SkillEffect, value: eff.value,
                message: `[技能] 「${actor.cardId}」發動『${skill.name}』：對「${live.cardId}」附加【${statusType}】`,
              });
              break;
            }

            // ── Instant kill ──────────────────────────────────────────────
            case SkillEffect.INSTANT_KILL: {
              s = appendLog(s, s.phase, {
                actorId: actor.instanceId, targetId: live.instanceId,
                effect: SkillEffect.INSTANT_KILL, value: 0,
                message: `[技能] 「${actor.cardId}」發動『${skill.name}』：即殺「${live.cardId}」`,
              });
              s = killCard(s, live);
              break;
            }

            default:
              break;
          }
          }     // for (const ref of targetRefs)
        }       // for (let ci = 0; ci < loopCount; ci++)
      }
    }

    return s;
  }
}
