<template>
  <div class="xhs-search">
    <section class="surface-card">
      <div class="surface-card__body">
        <h3 class="surface-card__title">搜索小红书内容</h3>
        <div class="search-row">
          <div class="field field--grow">
            <label class="field__label" for="search-kw">关键词</label>
            <el-input
              id="search-kw"
              v-model="keyword"
              clearable
              placeholder="输入搜索关键词"
              @keyup.enter="doSearch"
            />
          </div>
          <div class="field field--action">
            <el-button type="primary" :loading="loading" :disabled="!keyword.trim()" @click="doSearch">
              搜索
            </el-button>
          </div>
        </div>
        <p class="feeds-intro">
          数据来自 MCP <code>search_feeds</code>，解析规则与推荐列表一致；成功后会写入本地缓存。点击卡片进入「帖子详情与评论」页。
        </p>
        <p v-if="display" class="feeds-count feeds-count--below">
          当前列表 <strong>{{ display.count }}</strong> 条
          <span v-if="fromCacheOnly" class="feeds-count__cache">（来自缓存）</span>
        </p>
      </div>
    </section>

    <div v-if="hasGrid && display" class="feeds-grid">
      <FeedCard v-for="item in display.feeds" :key="item.id" :item="item" @pick="onPickFeed" />
    </div>

    <section
      v-if="!loading && result !== null && !hasGrid && fromSearchFeedsFlag"
      class="surface-card feeds-empty"
    >
      <div class="surface-card__body">
        <p class="feeds-empty__text">
          未解析到搜索结果。请查看底部「执行状态」原始 JSON。
        </p>
      </div>
    </section>

    <section
      v-else-if="!loading && result !== null && !hasGrid && !fromSearchFeedsFlag && !searchCache"
      class="surface-card feeds-empty feeds-empty--muted"
    >
      <div class="surface-card__body">
        <p class="feeds-empty__text">当前控制台数据来自其他操作。请输入关键词后点击「搜索」。</p>
      </div>
    </section>

    <section
      v-else-if="!loading && result === null && !searchCache"
      class="surface-card feeds-empty feeds-empty--muted"
    >
      <div class="surface-card__body">
        <p class="feeds-empty__text">输入关键词并搜索，或查看已缓存的上次结果。</p>
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
import { loadSearchFeedsCache, saveSearchFeedsCache } from '@/utils/xhsFeedListStorage'
import { XHS_MCP } from '@/constants/xhsMcpTools'
import FeedCard from '@/components/xiaohongshu/FeedCard.vue'

const router = useRouter()
const store = useMcpConsoleStore()
const { loading, result, message } = storeToRefs(store)
const { runTool } = store

const keyword = ref('')
const searchCache = ref(null)

onMounted(() => {
  const c = loadSearchFeedsCache()
  if (c) {
    searchCache.value = { keyword: c.keyword, feeds: c.feeds, count: c.count }
    keyword.value = c.keyword
  }
})

const parsed = computed(() => parseFeedsFromMcpResult(result.value))

const fromSearchFeedsFlag = computed(() => {
  const msg = message.value || ''
  return msg.includes('search_feeds') || msg.includes('mcp-search_feeds')
})

watch([parsed, fromSearchFeedsFlag, keyword], () => {
  const p = parsed.value
  if (!p || !fromSearchFeedsFlag.value || p.feeds.length === 0) return
  const kw = keyword.value.trim()
  const finalKw = kw || searchCache.value?.keyword || ''
  saveSearchFeedsCache(finalKw, p.feeds, p.count)
  searchCache.value = { keyword: finalKw, feeds: p.feeds, count: p.count }
})

const display = computed(() => {
  const p = parsed.value
  const sf = fromSearchFeedsFlag.value
  if (p && sf && p.feeds.length > 0) return p
  if (searchCache.value) {
    return { feeds: searchCache.value.feeds, count: searchCache.value.count }
  }
  return null
})

const hasGrid = computed(() => Boolean(display.value && display.value.feeds.length > 0))

const fromCacheOnly = computed(() => {
  const p = parsed.value
  const sf = fromSearchFeedsFlag.value
  return Boolean(display.value && !(p && sf && p.feeds.length > 0))
})

function doSearch() {
  const kw = keyword.value.trim()
  if (!kw) return
  runTool(XHS_MCP.SEARCH_FEEDS, { keyword: kw })
}

function onPickFeed(feedId, xsecToken) {
  router.push({
    path: '/xiaohongshu/feed-detail',
    query: { feed_id: feedId, xsec_token: xsecToken },
  })
}
</script>

<style scoped>
.xhs-search {
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
  margin: 0 0 12px;
  font-size: 16px;
  font-weight: 600;
}
.search-row {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 12px;
  margin-bottom: 8px;
}
.field--grow {
  flex: 1;
  min-width: 200px;
}
.field--action {
  flex-shrink: 0;
}
.field__label {
  display: block;
  font-size: 13px;
  color: var(--el-text-color-regular);
  margin-bottom: 6px;
}
.feeds-intro {
  margin: 0;
  font-size: 13px;
  color: var(--el-text-color-secondary);
  line-height: 1.6;
}
.feeds-count {
  margin: 10px 0 0;
  font-size: 14px;
  color: var(--el-text-color-regular);
}
.feeds-count__cache {
  margin-left: 6px;
  color: var(--el-text-color-secondary);
  font-size: 13px;
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
