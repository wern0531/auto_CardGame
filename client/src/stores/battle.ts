import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { BattleState, DeckDefinition } from '@auto-battle/shared';
import { socket } from '../services/socket';
import router from '../router';

export const useBattleStore = defineStore('battle', () => {
  // ── State ──────────────────────────────────────────────────────────────────
  const battleState = ref<BattleState | null>(null);
  const myPlayerId  = ref<string | null>(null);
  const isConnected = ref(false);
  const error       = ref<string | null>(null);

  // ── Socket listeners (registered once on store creation) ──────────────────
  socket.on('connect', () => {
    isConnected.value = true;
    console.log('[Socket] connected');
  });

  socket.on('disconnect', () => {
    isConnected.value = false;
    console.log('[Socket] disconnected');
  });

  socket.on('match_found', (payload: { battleId: string; initialState: BattleState }) => {
    battleState.value = payload.initialState;
    router.push(`/battle/${payload.battleId}`);
  });

  socket.on('battle_update', (state: BattleState) => {
    battleState.value = state;
  });

  socket.on('connect_error', (err) => {
    error.value = `Connection failed: ${err.message}`;
  });

  // ── Actions ────────────────────────────────────────────────────────────────
  function startCampaign(myDeck: DeckDefinition) {
    myPlayerId.value = myDeck.ownerId;
    error.value = null;
    if (!socket.connected) socket.connect();
    socket.emit('start_campaign', myDeck);
  }

  function startArena(myDeck: DeckDefinition) {
    myPlayerId.value = myDeck.ownerId;
    error.value = null;
    if (!socket.connected) socket.connect();
    socket.emit('start_arena', myDeck);
  }

  return {
    battleState,
    myPlayerId,
    isConnected,
    error,
    startCampaign,
    startArena,
  };
});
