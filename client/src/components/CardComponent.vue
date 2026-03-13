<template>
  <div
    class="card-wrapper"
    :class="[`card--${card.type}`, { 'card--ready': isReady }]"
    :style="bgStyle"
  >
    <Transition name="overlay-fade">
      <div v-if="showCooldownOverlay" class="cooldown-overlay">
        <span class="overlay-icon">⏳</span>
        <span class="overlay-num">{{ card.currentStats.cooldown }}</span>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { CardInstance } from '@auto-battle/shared';
import cardData from '../../../shared/templates/cards.json';

const props = defineProps<{ card: CardInstance }>();

// 取得卡片靜態資料
const templateMap = Object.fromEntries(
  (cardData as Array<any>).map((c) => [c.cardId, c]),
);
const template = computed(() => templateMap[props.card.cardId]);

// 動態綁定背景圖片
const bgStyle = computed(() => {
  const url = template.value?.imageUrl;
  if (url) {
    return {
      backgroundImage: `url(${url})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
    };
  }
  // 如果這張卡片還沒設定圖片，給一個預設的深灰色防呆
  return { backgroundColor: '#2a2a35' };
});

// 遊戲機制狀態
const showCooldownOverlay = computed(
  () =>
    props.card.currentZone === 'hand' && props.card.currentStats.cooldown > 0,
);
const isReady = computed(
  () =>
    props.card.currentZone === 'hand' && props.card.currentStats.cooldown === 0,
);
</script>

<style scoped>
/* ── 容器與等比例縮放核心 ── */
.card-wrapper {
  container-type: inline-size;
  container-name: card;
  width: 100%;
  aspect-ratio: 5 / 7;
  position: relative;
  border-radius: 8px;
  box-sizing: border-box;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.6);
  user-select: none;
  overflow: hidden;
  border: 1px solid #222; /* 給個細細的暗色外框，如果圖片自帶外框也可以把這行拿掉 */
}

/* ── 準備好可施放的動畫 (發光特效) ── */
.card--ready {
  box-shadow:
    0 0 0 2px #fbbf24,
    0 0 14px 4px rgba(251, 191, 36, 0.55);
  animation: pulse-ready 1.4s ease-in-out infinite;
  z-index: 2;
}
@keyframes pulse-ready {
  0%,
  100% {
    box-shadow:
      0 0 0 2px #fbbf24,
      0 0 12px 3px rgba(251, 191, 36, 0.4);
  }
  50% {
    box-shadow:
      0 0 0 2px #fbbf24,
      0 0 22px 8px rgba(251, 191, 36, 0.8);
  }
}

/* ── CD 遮罩 (在手牌中還不能打出的狀態) ── */
.cooldown-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.75);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 10;
}
.overlay-icon {
  font-size: 10cqw;
}
.overlay-num {
  font-size: 14cqw;
  font-weight: 900;
  color: #93c5fd;
}

.overlay-fade-enter-active,
.overlay-fade-leave-active {
  transition: opacity 0.25s ease;
}
.overlay-fade-enter-from,
.overlay-fade-leave-to {
  opacity: 0;
}
</style>
