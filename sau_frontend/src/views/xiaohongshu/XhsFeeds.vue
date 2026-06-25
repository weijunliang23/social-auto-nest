<template>
  <div class="xhs-feeds">
    <section class="surface-card">
      <div class="surface-card__body">
        <div class="feeds-toolbar">
          <h3 class="surface-card__title">首页推荐列表</h3>
          <el-button type="primary" :loading="loading" @click="refresh">
            {{ loading ? '加载中…' : '刷新推荐' }}
          </el-button>
          <span v-if="display" class="feeds-count">
            共 <strong>{{ display.count }}</strong> 条
            <span v-if="fromCacheOnly" class="feeds-count__cache">（已缓存，切换页面仍会保留）</span>
          </span>
        </div>
        <p class="feeds-intro">
          数据来自 MCP <code>list_feeds</code>，成功加载后会写入本地缓存。点击卡片进入「帖子详情与评论」页。
        </p>
      </div>
    </section>

    <div v-if="hasFeedGrid && display" class="feeds-grid">
      <FeedCard
        v-for="item in display.feeds"
        :key="item.id"
        :item="item"
        @pick="onPickFeed"
      />
    </div>

    <section
      v-if="!loading && result !== null && !hasFeedGrid && fromListFeedsFlag"
      class="surface-card feeds-empty"
    >
      <div class="surface-card__body">
        <p class="feeds-empty__text">
          未解析到笔记列表（返回格式可能变化）。请查看底部「执行状态」原始 JSON。
        </p>
      </div>
    </section>

    <section
      v-else-if="!loading && result !== null && !hasFeedGrid && !fromListFeedsFlag && !homeCache"
      class="surface-card feeds-empty feeds-empty--muted"
    >
      <div class="surface-card__body">
        <p class="feeds-empty__text">当前控制台数据来自其他操作。请点击「刷新推荐」加载首页列表。</p>
      </div>
    </section>

    <section
      v-else-if="!loading && result === null && !homeCache"
      class="surface-card feeds-empty feeds-empty--muted"
    >
      <div class="surface-card__body">
        <p class="feeds-empty__text">点击「刷新推荐」加载首页 Feeds。</p>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useRouter } from 'vue-router'
import { useMcpConsoleStore } from '@/stores/mcpConsole'
import { parseFeedsFromMcpResult } from '@/utils/parseXhsListFeeds'
import { loadHomeFeedsCache, saveHomeFeedsCache } from '@/utils/xhsFeedListStorage'
import { XHS_MCP } from '@/constants/xhsMcpTools'
import FeedCard from '@/components/xiaohongshu/FeedCard.vue'

const router = useRouter()
const store = useMcpConsoleStore()
const { loading, result, message } = storeToRefs(store)
const { runTool } = store

const homeCache = ref(null)

onMounted(() => {
  const c = loadHomeFeedsCache()
  if (c) homeCache.value = { feeds: c.feeds, count: c.count }
})

const parsed = computed(() => parseFeedsFromMcpResult(result.value))

const fromListFeedsFlag = computed(() => {
  const msg = message.value || ''
  return msg.includes('list_feeds') || msg.includes('mcp-list_feeds')
})

watch([parsed, fromListFeedsFlag], () => {
  const p = parsed.value
  if (!p || !fromListFeedsFlag.value || p.feeds.length === 0) return
  saveHomeFeedsCache(p.feeds, p.count)
  homeCache.value = { feeds: p.feeds, count: p.count }
})

const display = computed(() => {
  const p = parsed.value
  const fl = fromListFeedsFlag.value
  if (p && fl && p.feeds.length > 0) return p
  if (homeCache.value) {
    return { feeds: homeCache.value.feeds, count: homeCache.value.count }
  }
  return null
})

const hasFeedGrid = computed(() => Boolean(display.value && display.value.feeds.length > 0))

const fromCacheOnly = computed(() => {
  const p = parsed.value
  const fl = fromListFeedsFlag.value
  return Boolean(display.value && !(p && fl && p.feeds.length > 0))
})

function refresh() {
  runTool(XHS_MCP.LIST_FEEDS, {})
}

function onPickFeed(feedId, xsecToken) {
  router.push({
    path: '/xiaohongshu/feed-detail',
    query: { feed_id: feedId, xsec_token: xsecToken },
  })
}
</script>

<style scoped>
.xhs-feeds {
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
  margin: 0;
  font-size: 16px;
  font-weight: 600;
}
.feeds-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
}
.feeds-count {
  font-size: 14px;
  color: var(--el-text-color-regular);
}
.feeds-count__cache {
  margin-left: 6px;
  color: var(--el-text-color-secondary);
  font-size: 13px;
}
.feeds-intro {
  margin: 0;
  font-size: 13px;
  color: var(--el-text-color-secondary);
  line-height: 1.6;
}
.feeds-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 16px;
}
.feeds-empty {
  margin-top: 8px;
}
.feeds-empty--muted .feeds-empty__text {
  color: var(--el-text-color-secondary);
}
.feeds-empty__text {
  margin: 0;
  font-size: 14px;
  line-height: 1.6;
}
</style>
