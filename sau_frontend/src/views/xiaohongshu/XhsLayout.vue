<template>
  <div class="xhs-layout">
    <router-view />
    <ExecutionConsole />
  </div>
</template>

<script setup>
import ExecutionConsole from '@/components/xiaohongshu/ExecutionConsole.vue'
</script>

<style scoped>
.xhs-layout {
  max-width: 1200px;
}
</style>
