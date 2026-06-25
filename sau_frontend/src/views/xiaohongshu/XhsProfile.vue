<template>
  <div class="xhs-profile">
    <section class="surface-card">
      <div class="surface-card__body">
        <h3 class="surface-card__title">用户主页</h3>
        <p class="profile-intro">
          调用 MCP <code>user_profile</code> 拉取用户主页数据；完整响应见底部「执行状态」控制台。
        </p>
        <div class="grid-2">
          <div class="field">
            <label class="field__label" for="prof-uid">user_id</label>
            <el-input id="prof-uid" v-model="userId" clearable placeholder="用户 ID" />
          </div>
          <div class="field">
            <label class="field__label" for="prof-token">xsec_token</label>
            <el-input id="prof-token" v-model="xsecToken" clearable placeholder="xsec_token" />
          </div>
        </div>
        <div class="action-toolbar">
          <el-button type="primary" :loading="loading" :disabled="!canSubmit" @click="fetchProfile">
            查看主页
          </el-button>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useMcpConsoleStore } from '@/stores/mcpConsole'
import { XHS_MCP } from '@/constants/xhsMcpTools'

const route = useRoute()
const store = useMcpConsoleStore()
const { loading } = storeToRefs(store)
const { runTool } = store

const userId = ref('')
const xsecToken = ref('')

function qStr(v) {
  if (typeof v === 'string') return v
  if (Array.isArray(v) && typeof v[0] === 'string') return v[0]
  return ''
}

function applyRouteQuery() {
  const q = route.query
  const uid = qStr(q.user_id)
  const tok = qStr(q.xsec_token)
  if (uid) userId.value = uid
  if (tok) xsecToken.value = tok
}

watch(
  () => route.query,
  () => applyRouteQuery(),
  { immediate: true, deep: true }
)

const canSubmit = computed(() => Boolean(userId.value.trim() && xsecToken.value.trim()))

function fetchProfile() {
  const uid = userId.value.trim()
  const tok = xsecToken.value.trim()
  if (!uid || !tok) return
  runTool(XHS_MCP.USER_PROFILE, { user_id: uid, xsec_token: tok })
}
</script>

<style scoped>
.xhs-profile {
  padding: 8px 0;
}
.surface-card {
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 10px;
  background: var(--el-bg-color);
  margin-bottom: 16px;
}
.surface-card__body {
  padding: 16px 18px;
}
.surface-card__title {
  margin: 0 0 8px;
  font-size: 16px;
  font-weight: 600;
}
.profile-intro {
  margin: 0 0 14px;
  font-size: 13px;
  color: var(--el-text-color-secondary);
  line-height: 1.6;
}
.grid-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}
@media (max-width: 640px) {
  .grid-2 {
    grid-template-columns: 1fr;
  }
}
.field__label {
  display: block;
  font-size: 13px;
  color: var(--el-text-color-regular);
  margin-bottom: 6px;
}
.action-toolbar {
  margin-top: 14px;
}
</style>
