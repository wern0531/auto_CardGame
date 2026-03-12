<template>
  <div class="hub">

    <!-- ── Top Banner ──────────────────────────────────────────────────── -->
    <header class="top-banner">
      <div class="player-info">
        <div class="avatar">⚔</div>
        <div class="player-text">
          <span class="player-name">Player One</span>
          <span class="player-level">Lv. 7</span>
        </div>
      </div>
      <div class="resources">
        <span class="resource">⚡ <b>50</b> / 50</span>
        <span class="resource">💰 <b>1,240</b></span>
      </div>
    </header>

    <!-- ── Nav Bar ─────────────────────────────────────────────────────── -->
    <nav class="nav-bar">
      <button
        v-for="tab in TABS"
        :key="tab.id"
        class="nav-btn"
        :class="{ 'nav-btn--active': currentTab === tab.id }"
        @click="currentTab = tab.id"
      >
        <span class="nav-icon">{{ tab.icon }}</span>
        <span class="nav-label">{{ tab.label }}</span>
      </button>
    </nav>

    <!-- ── Content Area ────────────────────────────────────────────────── -->
    <main class="content-area">

      <!-- Battle Hub -->
      <template v-if="currentTab === 'battle-hub'">
        <div class="battle-hub">
          <div
            v-for="entry in battleEntries"
            :key="entry.id"
            class="entry-card"
          >
            <div class="entry-art" :style="{ background: entry.gradient }">
              <span class="entry-art-icon">{{ entry.icon }}</span>
            </div>
            <div class="entry-info">
              <h3 class="entry-title">{{ entry.title }}</h3>
              <p class="entry-desc">{{ entry.desc }}</p>
              <span class="entry-progress">{{ entry.progress }}</span>
            </div>
            <button class="btn-enter" @click="router.push(entry.route)">
              進入<br><span>Enter</span>
            </button>
          </div>
        </div>
      </template>

      <!-- Squad (Deck Builder embedded) -->
      <template v-else-if="currentTab === 'squad'">
        <DeckBuilderView />
      </template>

      <!-- Other tabs -->
      <template v-else>
        <div class="under-construction">
          <span class="uc-icon">🚧</span>
          <p>{{ TABS.find(t => t.id === currentTab)?.label }} — Under Construction</p>
          <span class="uc-sub">即將開放，敬請期待</span>
        </div>
      </template>

    </main>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import DeckBuilderView from './DeckBuilderView.vue';

const router = useRouter();

type TabId = 'battle-hub' | 'squad' | 'defense' | 'shop';
const currentTab = ref<TabId>('battle-hub');

const TABS = [
  { id: 'battle-hub' as TabId, icon: '⚔', label: '戰鬥 Battle' },
  { id: 'squad'      as TabId, icon: '🃏', label: '部隊編制 Squad' },
  { id: 'defense'    as TabId, icon: '🛡', label: '防守設定 Defense' },
  { id: 'shop'       as TabId, icon: '🏪', label: '商城 Store' },
];

const battleEntries = [
  {
    id: 'campaign',
    icon: '🗺',
    title: '關卡地圖 Campaign',
    desc: '跟隨主線故事，擊敗強大敵人',
    progress: '進度：Act 1 - 3/10 關',
    gradient: 'linear-gradient(135deg, #4c1d95, #7c3aed)',
    route: '/campaign',
  },
  {
    id: 'arena',
    icon: '🏆',
    title: '競技場 Arena',
    desc: '與其他玩家的部隊一較高下',
    progress: '本季排名：#128',
    gradient: 'linear-gradient(135deg, #78350f, #d97706)',
    route: '/arena',
  },
  {
    id: 'special',
    icon: '⭐',
    title: '特殊任務 Special',
    desc: '限時高難度挑戰，豐厚獎勵',
    progress: '本週任務：2/3 完成',
    gradient: 'linear-gradient(135deg, #064e3b, #059669)',
    route: '/special',
  },
];
</script>

<style scoped>
/* ── Root Shell ──────────────────────────────────────────────────────────── */
.hub {
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
  background: #0d0d1a;
  color: #e2e8f0;
}

/* ── Top Banner ──────────────────────────────────────────────────────────── */
.top-banner {
  flex-shrink: 0;
  height: 80px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  background: #080d18;
  border-bottom: 1px solid #1e293b;
}

.player-info {
  display: flex;
  align-items: center;
  gap: 10px;
}

.avatar {
  width: 48px;
  height: 48px;
  border: 2px solid #b8922a;
  border-radius: 10px;
  background: rgba(184,146,42,0.12);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.4rem;
}

.player-text {
  display: flex;
  flex-direction: column;
}
.player-name { font-size: 13px; font-weight: 700; color: #f1f5f9; }
.player-level { font-size: 10px; color: #b8922a; }

.resources {
  display: flex;
  gap: 20px;
}

.resource {
  font-size: 13px;
  color: #94a3b8;
}
.resource b { color: #e2e8f0; }

/* ── Nav Bar ─────────────────────────────────────────────────────────────── */
.nav-bar {
  flex-shrink: 0;
  display: flex;
  background: #0a0f1e;
  border-bottom: 1px solid #1e293b;
}

.nav-btn {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3px;
  padding: 8px 4px;
  border: none;
  background: transparent;
  color: #4b5563;
  cursor: pointer;
  transition: color 0.15s, background 0.15s;
  border-bottom: 2px solid transparent;
  font-size: 11px;
}

.nav-btn:hover { color: #94a3b8; background: rgba(255,255,255,0.03); }

.nav-btn--active {
  color: #f59e0b;
  border-bottom-color: #f59e0b;
  background: rgba(245,158,11,0.06);
}

.nav-icon  { font-size: 1.1rem; }
.nav-label { font-size: 10px; font-weight: 600; }

/* ── Content Area ────────────────────────────────────────────────────────── */
.content-area {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

/* ── Battle Hub ──────────────────────────────────────────────────────────── */
.battle-hub {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 16px;
}

.entry-card {
  display: flex;
  align-items: center;
  gap: 14px;
  background: rgba(255,255,255,0.05);
  border: 1px solid #334155;
  border-radius: 8px;
  padding: 12px;
  transition: border-color 0.15s, background 0.15s;
}
.entry-card:hover {
  border-color: #475569;
  background: rgba(255,255,255,0.07);
}

.entry-art {
  flex-shrink: 0;
  width: 80px;
  height: 80px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2rem;
}

.entry-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.entry-title {
  font-size: 15px;
  font-weight: 700;
  color: #f1f5f9;
  margin: 0;
}

.entry-desc {
  font-size: 12px;
  color: #94a3b8;
  margin: 0;
}

.entry-progress {
  font-size: 11px;
  color: #475569;
}

.btn-enter {
  flex-shrink: 0;
  padding: 10px 18px;
  background: linear-gradient(135deg, #1e3a5f, #2563eb);
  border: none;
  border-radius: 8px;
  color: #fff;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  text-align: center;
  line-height: 1.4;
  transition: opacity 0.15s, transform 0.15s;
}
.btn-enter span { font-size: 10px; opacity: 0.7; font-weight: 400; }
.btn-enter:hover { opacity: 0.88; transform: translateY(-1px); }

/* ── Under Construction ──────────────────────────────────────────────────── */
.under-construction {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  color: #374151;
}

.uc-icon { font-size: 2.5rem; }

.under-construction p {
  font-size: 1.1rem;
  font-weight: 600;
  color: #4b5563;
  margin: 0;
}

.uc-sub { font-size: 12px; }
</style>
