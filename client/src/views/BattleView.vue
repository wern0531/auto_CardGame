<template>
  <div class="battle">
    <p>Battle: {{ battleId }}</p>
  </div>
</template>

<script setup lang="ts">
import { useRoute } from 'vue-router';

const route = useRoute();
const battleId = route.params.battleId as string;
</script>
