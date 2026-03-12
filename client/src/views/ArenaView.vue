<template>
  <div class="fullscreen-view">
    <RouterLink to="/" class="back-btn">← Back to Hub</RouterLink>
    <div class="center-content">
      <h1>Arena - Under Construction</h1>
      <p>競技場排行對戰，即將開放</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { RouterLink } from 'vue-router';
</script>

<style scoped>
.fullscreen-view {
  height: 100vh;
  background: #0d0d1a;
  color: white;
  display: flex;
  flex-direction: column;
  position: relative;
}

.back-btn {
  position: absolute;
  top: 16px;
  left: 16px;
  color: #60a5fa;
  text-decoration: none;
  font-size: 14px;
  padding: 6px 12px;
  border: 1px solid #334155;
  border-radius: 6px;
  background: rgba(255,255,255,0.05);
  transition: background 0.15s;
}
.back-btn:hover { background: rgba(255,255,255,0.1); }

.center-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
}

.center-content h1 {
  font-size: 2rem;
  font-weight: 700;
  color: #e2e8f0;
  margin: 0;
}

.center-content p {
  color: #94a3b8;
  margin: 0;
}
</style>
