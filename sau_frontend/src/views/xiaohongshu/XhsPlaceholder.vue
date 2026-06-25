<template>
  <div class="xhs-placeholder">
    <el-empty :description="title + '（建设中）'" />
  </div>
</template>

<script setup>
defineProps({
  title: { type: String, default: '页面' },
})
</script>

<style scoped>
.xhs-placeholder {
  padding: 24px;
}
</style>
