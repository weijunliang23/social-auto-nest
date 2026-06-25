<template>
  <div class="xhs-console-block">
    <div class="xhs-console-block__head">
      <el-icon><Monitor /></el-icon>
      <span class="xhs-console-block__title">执行状态（MCP）</span>
    </div>
    <div class="xhs-console">
      <div class="xhs-console__bar">
        <span class="xhs-console__dots" aria-hidden>
          <i /><i /><i />
        </span>
        <span class="xhs-console__label">mcp / console</span>
      </div>
      <div class="xhs-console__body">
        <div class="xhs-console__line">
          [{{ timeStr }}] {{ message }}
        </div>
        <div v-if="loading" class="xhs-console__line xhs-console__line--pending">请求进行中...</div>
        <pre v-else-if="result !== null && result !== undefined" class="xhs-console__json">{{ resultText }}</pre>
        <div v-else class="xhs-console__line xhs-console__line--muted">等待调用 MCP...</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { Monitor } from '@element-plus/icons-vue'
import { useMcpConsole } from '@/composables/useMcpConsole'
import { safeJsonForConsole } from '@/utils/safeJsonForConsole'

const { loading, message, result } = useMcpConsole()

const timeStr = computed(() =>
  new Date().toLocaleTimeString('zh-CN', { hour12: false }),
)

const resultText = computed(() => safeJsonForConsole(result.value))
</script>

<style scoped>
.xhs-console-block {
  margin-top: 24px;
  border: 1px solid var(--el-border-color);
  border-radius: 8px;
  overflow: hidden;
  background: var(--el-fill-color-blank);
}
.xhs-console-block__head {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  background: var(--el-fill-color-light);
  font-weight: 600;
  font-size: 14px;
}
.xhs-console-block__title {
  color: var(--el-text-color-primary);
}
.xhs-console {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 12px;
}
.xhs-console__bar {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 12px;
  background: #1e1e1e;
  color: #ccc;
}
.xhs-console__dots {
  display: inline-flex;
  gap: 4px;
}
.xhs-console__dots i {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #ff5f57;
}
.xhs-console__dots i:nth-child(2) {
  background: #febc2e;
}
.xhs-console__dots i:nth-child(3) {
  background: #28c840;
}
.xhs-console__label {
  opacity: 0.85;
}
.xhs-console__body {
  padding: 12px 14px;
  background: #0d1117;
  color: #e6edf3;
  min-height: 80px;
  max-height: 320px;
  overflow: auto;
}
.xhs-console__line {
  white-space: pre-wrap;
  word-break: break-word;
  line-height: 1.5;
}
.xhs-console__line--pending {
  color: #79c0ff;
}
.xhs-console__line--muted {
  color: #8b949e;
}
.xhs-console__json {
  margin: 8px 0 0;
  white-space: pre-wrap;
  word-break: break-word;
  color: #a5d6ff;
}
</style>
