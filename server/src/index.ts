import express from 'express';
import { createServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { GameEngine } from './engine/GameEngine';
import type { BattleState, CardTemplate, DeckDefinition } from '@auto-battle/shared';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const cardTemplates: CardTemplate[] = require('../../shared/templates/cards.json');
const engine = new GameEngine(cardTemplates);

const app = express();
const httpServer = createServer(app);
const io = new SocketIOServer(httpServer, {
  cors: { origin: 'http://localhost:5173', methods: ['GET', 'POST'] }
});

app.use(express.json());
app.get('/health', (_req, res) => res.json({ status: 'ok' }));

// ─── In-memory battle registry ────────────────────────────────────────────────

const battles   = new Map<string, BattleState>();          // battleId → state
const intervals = new Map<string, ReturnType<typeof setInterval>>(); // battleId → timer
const socketToBattle = new Map<string, string>();           // socketId → battleId

// ─── Auto-play loop ───────────────────────────────────────────────────────────

function startAutoPlay(socket: Socket, battleId: string, intervalMs = 2000) {
  const timer = setInterval(() => {
    let state = battles.get(battleId);
    if (!state) { clearInterval(timer); return; }

    state = engine.executeTurn(state);
    battles.set(battleId, state);
    socket.emit('battle_update', state);

    if (state.isOver) {
      clearInterval(timer);
      intervals.delete(battleId);
      console.log(`[Battle ${battleId}] OVER – winner: ${state.winner}`);
    }
  }, intervalMs);

  intervals.set(battleId, timer);
}

function cleanupSocket(socketId: string) {
  const battleId = socketToBattle.get(socketId);
  if (battleId) {
    const timer = intervals.get(battleId);
    if (timer) { clearInterval(timer); intervals.delete(battleId); }
    battles.delete(battleId);
    socketToBattle.delete(socketId);
  }
}

// ─── Socket events ────────────────────────────────────────────────────────────

io.on('connection', (socket) => {
  console.log(`[Socket] connected: ${socket.id}`);

  // ── Campaign (PvE) ──────────────────────────────────────────────────────────
  socket.on('start_campaign', (playerDeck: DeckDefinition) => {
    cleanupSocket(socket.id); // clear any previous battle

    const cpuDeck: DeckDefinition = {
      ownerId: 'CPU_Boss',
      heroCardId: 'hero_red_001',  // deckLimit: 5
      cardIds: [
        'creature_red_001',
        'creature_red_002',
        'creature_green_001',
        'artifact_neutral_001',
        'spell_red_001',
      ],
    };

    const state = engine.initBattle(playerDeck, cpuDeck);
    battles.set(state.battleId, state);
    socketToBattle.set(socket.id, state.battleId);

    console.log(`[Campaign] battleId=${state.battleId}  ${playerDeck.ownerId} vs CPU_Boss`);
    socket.emit('match_found', { battleId: state.battleId, initialState: state });
    startAutoPlay(socket, state.battleId);
  });

  // ── Arena (PvP simulated) ───────────────────────────────────────────────────
  socket.on('start_arena', (playerDeck: DeckDefinition) => {
    cleanupSocket(socket.id);

    const defenderDeck: DeckDefinition = {
      ownerId: 'Arena_Defender',
      heroCardId: 'hero_blue_001',  // deckLimit: 9
      cardIds: [
        'creature_blue_001',
        'creature_blue_002',
        'creature_blue_002',
        'creature_green_001',
        'creature_red_002',
        'artifact_neutral_001',
        'artifact_neutral_002',
        'spell_blue_001',
        'spell_red_001',
      ],
    };

    const state = engine.initBattle(playerDeck, defenderDeck);
    battles.set(state.battleId, state);
    socketToBattle.set(socket.id, state.battleId);

    console.log(`[Arena] battleId=${state.battleId}  ${playerDeck.ownerId} vs Arena_Defender`);
    socket.emit('match_found', { battleId: state.battleId, initialState: state });
    startAutoPlay(socket, state.battleId);
  });

  socket.on('disconnect', () => {
    console.log(`[Socket] disconnected: ${socket.id}`);
    cleanupSocket(socket.id);
  });
});

// ─── Start ────────────────────────────────────────────────────────────────────

const PORT = process.env.PORT ?? 3000;
httpServer.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
