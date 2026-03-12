<template>
  <div
    class="card-wrapper"
    :class="[`card--${card.type}`, { 'card--ready': isReady }]"
  >
    <div class="card-inner" :style="bgStyle">
      <div class="c-header">
        <div class="c-name">{{ displayName }}</div>
        <div class="c-type">{{ typeLabel }}</div>
      </div>

      <div class="c-info">
        <div class="info-section i-faction">
          <span class="i-icon">{{ factionIcon }}</span>
          <span class="i-text">{{ factionLabel }}</span>
        </div>
        <div class="info-section i-rarity">
          <span class="rarity-dot" :class="`bg-${rarity}`"></span>
          <span class="i-text">{{ rarityLabel }}</span>
        </div>
        <div class="info-section i-cost">
          <div class="cost-hex">{{ card.currentStats.cooldown }}</div>
        </div>
      </div>

      <div class="c-image-area"></div>

      <div class="c-effect">
        <div class="effect-text">
          <span class="keyword">戰吼：</span>進場時，對隨機敵方目標造成
          {{ card.currentStats.attack }} 點傷害。
        </div>
      </div>

      <div class="c-stats">
        <div class="stat-box cd-box">
          <span class="stat-label">CD</span>
          <span class="stat-value">{{ card.currentStats.cooldown }}</span>
        </div>
        <div class="stat-box atk-box">
          <span class="stat-label">ATK</span>
          <span class="stat-value">{{ card.currentStats.attack }}</span>
        </div>
        <div class="stat-box hp-box">
          <span class="stat-label">HP</span>
          <span class="stat-value"
            >{{ card.currentStats.hp }}/{{ card.currentStats.maxHp }}</span
          >
        </div>
      </div>
    </div>

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

const templateMap = Object.fromEntries(
  (cardData as Array<any>).map((c) => [c.cardId, c]),
);

// 基礎資料
const template = computed(() => templateMap[props.card.cardId]);
const displayName = computed(() => template.value?.name ?? props.card.cardId);

// 類型
const typeLabels: Record<string, string> = {
  hero: '英雄',
  creature: '單位',
  artifact: '裝備',
  spell: '法術',
};
const typeLabel = computed(() => typeLabels[props.card.type] ?? '未知');

// 陣營
const factionIcons: Record<string, string> = {
  red: '🔥',
  blue: '❄',
  green: '🌿',
  neutral: '⚪',
};
const factionLabels: Record<string, string> = {
  red: '帝國',
  blue: '聯盟',
  green: '精靈',
  neutral: '中立',
};
const factionIcon = computed(
  () => factionIcons[template.value?.faction] ?? '⚪',
);
const factionLabel = computed(
  () => factionLabels[template.value?.faction] ?? '中立',
);

// 稀有度
const rarityLabels: Record<string, string> = {
  common: '普通',
  rare: '稀有',
  epic: '史詩',
  legendary: '傳說',
};
const rarity = computed(() => template.value?.rarity ?? 'common');
const rarityLabel = computed(() => rarityLabels[rarity.value] ?? '普通');

// 圖片 (對應我們之前加在 models.ts 的 imageUrl)
const bgStyle = computed(() => {
  if (template.value?.imageUrl) {
    return {
      backgroundImage: `url(${template.value.imageUrl})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
    };
  }
  return {};
});

// 狀態
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
  /* 讓卡片容器定義一個 container 範圍，裡面的尺寸都參考這個寬度 */
  container-type: inline-size;
  container-name: card;
  width: 100%;
  aspect-ratio: 5 / 7;
  position: relative;
  border-radius: 4cqw; /* 圓角也跟著比例走，大約是 500px 下的 20px */
  background: #1e1e24; /* 外框底色 */
  padding: 2.5cqw; /* 外圈預留約 12.5px 邊框 */
  box-sizing: border-box;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.6);
  user-select: none;
  overflow: hidden;
  border: 1px solid #444;
}

/* 確保內容物完整填滿邊框內的空間，並套用 Flex 排版 */
.card-inner {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #2a2a35 center / cover no-repeat; /* 底板色；bgStyle 會覆蓋為插圖 */
  border-radius: 2cqw;
  overflow: hidden;
}

/* ── 1. 卡名列 (佔比 80/700 = 約 11.4%) ── */
.c-header {
  height: 11.4%;
  background: linear-gradient(to bottom, rgba(20, 20, 30, 0.88), rgba(20, 20, 30, 0.65));
  backdrop-filter: blur(4px);
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 3cqw;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}
.c-name {
  font-size: 5.6cqw; /* 500px 寬度時約 28px */
  font-weight: 800;
  color: #fff;
  text-shadow: 1px 1px 2px #000;
}
.c-type {
  font-size: 3.6cqw; /* 500px 寬度時約 18px */
  color: #ccc;
  font-weight: bold;
}

/* ── 2. 資訊小列 (佔比 60/700 = 約 8.5%) ── */
.c-info {
  height: 8.5%;
  background: rgba(10, 10, 20, 0.75);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}
.info-section {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1.5cqw;
  height: 100%;
}
.i-faction {
  border-right: 1px solid #333;
}
.i-rarity {
  border-right: 1px solid #333;
}
.i-icon {
  font-size: 3.5cqw;
}
.i-text {
  font-size: 2.8cqw;
  color: #ddd;
  font-weight: bold;
}

/* 稀有度顏色點 */
.rarity-dot {
  width: 2.5cqw;
  height: 2.5cqw;
  border-radius: 50%;
  box-shadow: 0 0 4px rgba(0, 0, 0, 0.8) inset;
}
.bg-common {
  background: #9ca3af;
}
.bg-rare {
  background: #3b82f6;
}
.bg-epic {
  background: #a855f7;
}
.bg-legendary {
  background: #f59e0b;
}

/* Cost / 準備值六角形 */
.cost-hex {
  width: 5cqw;
  height: 5cqw;
  background: #b91c1c;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 3cqw;
  font-weight: 900;
  border-radius: 1cqw; /* 簡易圓角矩形代替六角，避免 CSS 太複雜 */
  border: 1px solid #fca5a5;
  box-shadow: 0 0 5px #ff0000;
}

/* ── 3. 透明插圖透出區 (佔比 380/700 = 約 54.3%) ── */
.c-image-area {
  height: 54.3%;
  background: transparent; /* 完全透明，讓 card-inner 的底圖透出 */
}

/* ── 4. 效果文字區 (佔比 100/700 = 約 14.3%) ── */
.c-effect {
  height: 14.3%;
  background: rgba(8, 8, 18, 0.80);
  backdrop-filter: blur(4px);
  padding: 2cqw 3cqw;
  box-sizing: border-box;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
}
.effect-text {
  font-size: 2.8cqw;
  color: #e2e8f0;
  line-height: 1.4;
}
.keyword {
  color: #fbbf24;
  font-weight: 900;
}

/* ── 5. 數值列 (佔比 80/700 = 約 11.4%) ── */
.c-stats {
  height: 11.4%;
  display: flex;
  background: rgba(8, 8, 18, 0.85);
  backdrop-filter: blur(4px);
  padding: 1.5cqw 2cqw;
  gap: 2cqw;
  box-sizing: border-box;
}
.stat-box {
  flex: 1;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.10);
  border-radius: 1.5cqw;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}
.stat-label {
  font-size: 2cqw;
  color: #888;
  font-weight: bold;
}
.stat-value {
  font-size: 4cqw;
  font-weight: 900;
  text-shadow: 1px 1px 2px #000;
}
/* 個別數值顏色強化 */
.cd-box .stat-value {
  color: #93c5fd;
}
.atk-box .stat-value {
  color: #fde68a;
}
.hp-box .stat-value {
  color: #fca5a5;
}

/* ── 職業外框顏色 (可依照需求微調) ── */
.card--hero {
  border-color: #a78bfa;
  box-shadow: 0 0 8px #a78bfa;
}
.card--creature {
  border-color: #60a5fa;
}
.card--artifact {
  border-color: #fbbf24;
}
.card--spell {
  border-color: #34d399;
}

/* ── 準備好可施放的動畫 ── */
.card--ready {
  box-shadow:
    0 0 0 2px #fbbf24,
    0 0 14px 4px rgba(251, 191, 36, 0.55);
  animation: pulse-ready 1.4s ease-in-out infinite;
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

/* ── CD 遮罩 ── */
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
