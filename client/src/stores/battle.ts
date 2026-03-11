import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { BattleState } from '@auto-battle/shared';

export const useBattleStore = defineStore('battle', () => {
  const battleState = ref<BattleState | null>(null);
  const isConnected = ref(false);
  const myPlayerId = ref<string | null>(null);

  function setBattleState(state: BattleState) {
    battleState.value = state;
  }

  function setConnected(connected: boolean) {
    isConnected.value = connected;
  }

  function setPlayerId(id: string) {
    myPlayerId.value = id;
  }

  return {
    battleState,
    isConnected,
    myPlayerId,
    setBattleState,
    setConnected,
    setPlayerId
  };
});
