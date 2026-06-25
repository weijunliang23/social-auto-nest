<template>
  <div class="xhs-login">
    <h2 class="page-title">登录与状态</h2>
    <div class="toolbar">
      <el-button type="primary" :loading="loading" @click="runTool(XHS_MCP.CHECK_LOGIN, {})">
        检查登录状态
      </el-button>
      <el-button :loading="loading" @click="runTool(XHS_MCP.GET_LOGIN_QR, {})">
        获取登录二维码
      </el-button>
      <el-button type="danger" plain :loading="loading" @click="runTool(XHS_MCP.DELETE_COOKIES, {})">
        清理登录状态
      </el-button>
    </div>

    <div v-if="texts.length" class="login-hint">
      <p v-for="(t, i) in texts" :key="i" class="login-hint__text">{{ t }}</p>
    </div>

    <div v-if="images.length" class="login-qr-grid">
      <figure v-for="(img, i) in images" :key="i" class="login-qr-card">
        <img :src="img.dataUrl" alt="小红书登录二维码" class="login-qr-card__img" />
        <figcaption class="login-qr-card__cap">{{ img.mimeType }}</figcaption>
      </figure>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useMcpConsoleStore } from '@/stores/mcpConsole'
import { extractMcpContentParts } from '@/utils/mcpContent'
import { XHS_MCP } from '@/constants/xhsMcpTools'

const store = useMcpConsoleStore()
const { loading, result } = storeToRefs(store)
const { runTool } = store

const parts = computed(() => extractMcpContentParts(result.value))
const texts = computed(() => parts.value.texts)
const images = computed(() => parts.value.images)
</script>

<style scoped>
.xhs-login {
  padding: 16px;
}
.page-title {
  margin: 0 0 16px;
  font-size: 20px;
  font-weight: 600;
}
.toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 16px;
}
.login-hint {
  margin-bottom: 16px;
}
.login-hint__text {
  margin: 0 0 8px;
  line-height: 1.6;
  color: var(--el-text-color-regular);
}
.login-qr-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
}
.login-qr-card {
  margin: 0;
  padding: 12px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 8px;
  background: var(--el-fill-color-blank);
}
.login-qr-card__img {
  display: block;
  max-width: 280px;
  max-height: 280px;
  width: auto;
  height: auto;
}
.login-qr-card__cap {
  margin-top: 8px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}
</style>
