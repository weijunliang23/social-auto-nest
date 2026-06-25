<template>
  <div class="xhs-dashboard">
    <h2 class="page-title">总览</h2>
    <p class="hint">
      开发环境：请求经 Vite <code>/api/mcp/call</code> 转发至 Go MCP（默认 <code>127.0.0.1:18060</code>）。下方「执行状态」由
      <code>useMcpConsole</code> + Pinia 驱动，与 redbook 控制台行为一致。
    </p>
    <el-button type="primary" :loading="loading" @click="testMcp">
      测试 MCP（check_login_status）
    </el-button>
  </div>
</template>

<script setup>
import { useMcpConsole } from '@/composables/useMcpConsole'
import { XHS_MCP } from '@/constants/xhsMcpTools'

const { loading, runTool } = useMcpConsole()

function testMcp() {
  runTool(XHS_MCP.CHECK_LOGIN, {})
}
</script>

<style scoped>
.xhs-dashboard {
  padding: 16px;
}
.page-title {
  margin: 0 0 8px;
  font-size: 20px;
  font-weight: 600;
}
.hint {
  color: var(--el-text-color-secondary);
  margin: 12px 0;
  line-height: 1.6;
}
</style>
