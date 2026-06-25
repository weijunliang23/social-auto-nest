<template>
  <div class="xhs-feed-detail">
    <section class="surface-card">
      <div class="surface-card__body">
        <h3 class="surface-card__title">帖子详情与评论</h3>
        <p class="feeds-intro">
          从推荐列表点入会按路由参数请求详情；也可修改 <code>feed_id</code> / <code>xsec_token</code> 后点击「重新加载详情」。
        </p>
        <div class="grid-2">
          <div class="field">
            <label class="field__label" for="fd-id">feed_id</label>
            <el-input id="fd-id" v-model="feedId" clearable placeholder="笔记 ID" />
          </div>
          <div class="field">
            <label class="field__label" for="fd-token">xsec_token</label>
            <el-input id="fd-token" v-model="xsecToken" clearable placeholder="xsec_token" />
          </div>
        </div>
        <div class="action-toolbar">
          <el-button type="primary" :loading="loading" :disabled="!canCall" @click="fetchDetail">
            重新加载详情
          </el-button>
        </div>
      </div>
    </section>

    <div v-if="loading && !detail && canCall" class="feed-detail-placeholder">
      <el-icon class="feed-detail-placeholder__icon" :size="40"><Loading /></el-icon>
      <p>正在加载详情…</p>
    </div>

    <div
      v-else-if="!loading && canCall && !detail && result"
      class="feed-detail-placeholder feed-detail-placeholder--muted"
    >
      <p>当前返回无法解析为笔记详情（可能不是 get_feed_detail 的结果）。请查看底部执行控制台。</p>
    </div>

    <div
      v-else-if="!loading && canCall && !detail && !result"
      class="feed-detail-placeholder feed-detail-placeholder--muted"
    >
      <p>填写 feed_id 与 xsec_token 后从列表进入或点击「重新加载详情」。</p>
    </div>

    <article
      v-if="detail"
      class="surface-card feed-detail-card"
      :class="{ 'feed-detail-card--loading': loading }"
    >
      <div class="feed-detail-card__body">
        <p v-if="loading" class="feed-detail-updating" role="status">正在更新…</p>

        <header class="feed-detail-header">
          <div class="feed-detail-author">
            <img
              v-if="detail.user.avatar"
              class="feed-detail-author__avatar"
              :src="detail.user.avatar"
              alt=""
              referrerpolicy="no-referrer"
            />
            <div v-else class="feed-detail-author__avatar feed-detail-author__avatar--empty" aria-hidden="true" />
            <div class="feed-detail-author__meta">
              <span class="feed-detail-author__name">{{ detail.user.nickname }}</span>
              <span class="feed-detail-author__sub">
                {{ detail.ipLocation || '—' }} · {{ formatXhsDetailTime(detail.time) }}
              </span>
            </div>
          </div>
          <div class="feed-detail-actions">
            <el-button
              :type="detail.interact.liked ? 'default' : 'primary'"
              :disabled="loading || !canInteract"
              @click="handleLike"
            >
              <el-icon class="btn__icon-left"><StarFilled /></el-icon>
              {{ detail.interact.liked ? '取消点赞' : '点赞' }}
            </el-button>
            <el-button
              :type="detail.interact.collected ? 'default' : 'primary'"
              :disabled="loading || !canInteract"
              @click="handleFavorite"
            >
              <el-icon class="btn__icon-left"><Collection /></el-icon>
              {{ detail.interact.collected ? '取消收藏' : '收藏' }}
            </el-button>
          </div>
        </header>

        <h2 class="feed-detail-title">{{ detail.title }}</h2>

        <div class="feed-detail-stats">
          <span class="feed-detail-stat">
            <el-icon><StarFilled /></el-icon>
            {{ detail.interact.likedCount }}
          </span>
          <span class="feed-detail-stat">
            <el-icon><ChatDotRound /></el-icon>
            {{ detail.interact.commentCount }}
          </span>
          <span class="feed-detail-stat">
            <el-icon><Collection /></el-icon>
            {{ detail.interact.collectedCount }}
          </span>
          <span v-if="detail.interact.sharedCount && detail.interact.sharedCount !== '—'" class="feed-detail-stat">
            <el-icon><Share /></el-icon>
            {{ detail.interact.sharedCount }}
          </span>
          <span class="feed-detail-stats__badge">{{ detail.noteType }}</span>
        </div>

        <div v-if="detail.images.length > 0" class="feed-detail-gallery">
          <figure
            v-for="(img, i) in detail.images"
            :key="`${img.url}-${i}`"
            class="feed-detail-gallery__item"
          >
            <el-image
              class="feed-detail-gallery__thumb"
              :src="img.url"
              fit="cover"
              :preview-src-list="previewUrls"
              :initial-index="i"
              lazy
              preview-teleported
            >
              <template #error>
                <div class="feed-detail-gallery__err">加载失败</div>
              </template>
            </el-image>
          </figure>
        </div>

        <div class="feed-detail-desc">{{ detail.desc || '（无正文）' }}</div>

        <section class="feed-detail-comments">
          <h3 class="feed-detail-comments__title">
            评论
            <span v-if="detail.hasMoreComments" class="feed-detail-comments__hint">（可能还有更多）</span>
          </h3>
          <p v-if="detail.comments.length === 0" class="feed-detail-comments__empty">暂无评论</p>
          <ul v-else class="feed-detail-comment-list">
            <li v-for="c in detail.comments" :key="c.id" class="feed-detail-comment">
              <div class="feed-detail-comment__head">
                <span class="feed-detail-comment__name">
                  {{ c.nickname }}
                  <span v-if="c.isAuthor" class="feed-detail-comment__tag">作者</span>
                </span>
                <span class="feed-detail-comment__meta">
                  {{ c.ipLocation ? `${c.ipLocation} · ` : '' }}{{ formatXhsDetailTime(c.createTime) }} · 赞
                  {{ c.likeCount }}
                </span>
              </div>
              <p class="feed-detail-comment__text">{{ c.content }}</p>
              <ul v-if="c.subComments.length > 0" class="feed-detail-comment__replies">
                <li
                  v-for="s in c.subComments"
                  :key="s.id"
                  class="feed-detail-comment feed-detail-comment--reply"
                >
                  <div class="feed-detail-comment__head">
                    <span class="feed-detail-comment__name">
                      {{ s.nickname }}
                      <span v-if="s.isAuthor" class="feed-detail-comment__tag">作者</span>
                    </span>
                    <span class="feed-detail-comment__meta">
                      {{ formatXhsDetailTime(s.createTime) }} · 赞 {{ s.likeCount }}
                    </span>
                  </div>
                  <p class="feed-detail-comment__text">{{ s.content }}</p>
                </li>
              </ul>
            </li>
          </ul>
        </section>
      </div>
    </article>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import { storeToRefs } from 'pinia'
import { Loading, StarFilled, Collection, ChatDotRound, Share } from '@element-plus/icons-vue'
import { useMcpConsoleStore } from '@/stores/mcpConsole'
import { parseFeedDetailFromMcpResult, formatXhsDetailTime } from '@/utils/parseXhsFeedDetail'
import { XHS_MCP } from '@/constants/xhsMcpTools'

const route = useRoute()
const store = useMcpConsoleStore()
const { loading, result } = storeToRefs(store)
const { runTool } = store

const feedId = ref('')
const xsecToken = ref('')

function qStr(v) {
  if (typeof v === 'string') return v
  if (Array.isArray(v) && typeof v[0] === 'string') return v[0]
  return ''
}

function applyRouteQuery() {
  const q = route.query
  feedId.value = qStr(q.feed_id)
  xsecToken.value = qStr(q.xsec_token)
}

const idTrim = computed(() => feedId.value.trim())
const tokenTrim = computed(() => xsecToken.value.trim())
const canCall = computed(() => Boolean(idTrim.value && tokenTrim.value))
const canInteract = computed(() => canCall.value)

const parsed = computed(() => parseFeedDetailFromMcpResult(result.value))

const detail = computed(() => {
  const p = parsed.value
  if (!p) return null
  const id = idTrim.value
  if (id && p.feedId && p.feedId !== id) return null
  return p
})

const previewUrls = computed(() => detail.value?.images.map((img) => img.url).filter(Boolean) ?? [])

async function fetchDetail() {
  const id = idTrim.value
  const token = tokenTrim.value
  if (!id || !token) return
  await runTool(XHS_MCP.GET_FEED_DETAIL, { feed_id: id, xsec_token: token })
}

async function refreshAfterAction() {
  if (!canCall.value) return
  await runTool(XHS_MCP.GET_FEED_DETAIL, {
    feed_id: idTrim.value,
    xsec_token: tokenTrim.value,
  })
}

async function handleLike() {
  if (!canCall.value) return
  const unlike = detail.value?.interact.liked === true
  await runTool(XHS_MCP.LIKE_FEED, {
    feed_id: idTrim.value,
    xsec_token: tokenTrim.value,
    ...(unlike ? { unlike: true } : {}),
  })
  await refreshAfterAction()
}

async function handleFavorite() {
  if (!canCall.value) return
  const unfavorite = detail.value?.interact.collected === true
  await runTool(XHS_MCP.FAVORITE_FEED, {
    feed_id: idTrim.value,
    xsec_token: tokenTrim.value,
    ...(unfavorite ? { unfavorite: true } : {}),
  })
  await refreshAfterAction()
}

watch(
  () => route.query,
  () => {
    applyRouteQuery()
    if (canCall.value) void fetchDetail()
  },
  { immediate: true, deep: true }
)
</script>

<style scoped>
.xhs-feed-detail {
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
.feeds-intro {
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
.feed-detail-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 48px 16px;
  color: var(--el-text-color-regular);
}
.feed-detail-placeholder--muted {
  color: var(--el-text-color-secondary);
  font-size: 14px;
  text-align: center;
}
.feed-detail-placeholder__icon {
  color: var(--el-color-primary);
}
.feed-detail-card {
  overflow: hidden;
}
.feed-detail-card--loading {
  opacity: 0.92;
}
.feed-detail-card__body {
  padding: 16px 18px;
}
.feed-detail-updating {
  margin: 0 0 8px;
  font-size: 13px;
  color: var(--el-color-primary);
}
.feed-detail-header {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}
.feed-detail-author {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}
.feed-detail-author__avatar {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  object-fit: cover;
  flex-shrink: 0;
}
.feed-detail-author__avatar--empty {
  background: var(--el-fill-color-light);
}
.feed-detail-author__meta {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}
.feed-detail-author__name {
  font-weight: 600;
  font-size: 15px;
}
.feed-detail-author__sub {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}
.feed-detail-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.btn__icon-left {
  margin-right: 4px;
  vertical-align: middle;
}
.feed-detail-title {
  margin: 0 0 10px;
  font-size: 18px;
  font-weight: 600;
  line-height: 1.4;
}
.feed-detail-stats {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px 16px;
  margin-bottom: 14px;
  font-size: 13px;
  color: var(--el-text-color-regular);
}
.feed-detail-stat {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.feed-detail-stats__badge {
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 4px;
  background: var(--el-fill-color);
  color: var(--el-text-color-secondary);
}
.feed-detail-gallery {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 8px;
  margin-bottom: 14px;
}
.feed-detail-gallery__item {
  margin: 0;
  aspect-ratio: 1;
  border-radius: 8px;
  overflow: hidden;
}
.feed-detail-gallery__thumb {
  width: 100%;
  height: 100%;
}
.feed-detail-gallery__err {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 120px;
  background: var(--el-fill-color-light);
  font-size: 12px;
  color: var(--el-text-color-secondary);
}
.feed-detail-desc {
  white-space: pre-wrap;
  font-size: 14px;
  line-height: 1.65;
  color: var(--el-text-color-primary);
  margin-bottom: 20px;
}
.feed-detail-comments__title {
  margin: 0 0 10px;
  font-size: 15px;
  font-weight: 600;
}
.feed-detail-comments__hint {
  font-weight: 400;
  font-size: 13px;
  color: var(--el-text-color-secondary);
}
.feed-detail-comments__empty {
  margin: 0;
  font-size: 14px;
  color: var(--el-text-color-secondary);
}
.feed-detail-comment-list {
  list-style: none;
  margin: 0;
  padding: 0;
}
.feed-detail-comment {
  padding: 10px 0;
  border-bottom: 1px solid var(--el-border-color-lighter);
}
.feed-detail-comment:last-child {
  border-bottom: none;
}
.feed-detail-comment--reply {
  padding: 8px 0 8px 12px;
  margin-top: 4px;
  border-left: 2px solid var(--el-border-color);
  border-bottom: none;
}
.feed-detail-comment__head {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 6px;
  margin-bottom: 4px;
}
.feed-detail-comment__name {
  font-weight: 500;
  font-size: 14px;
}
.feed-detail-comment__tag {
  margin-left: 6px;
  font-size: 12px;
  font-weight: 400;
  color: var(--el-color-primary);
}
.feed-detail-comment__meta {
  font-size: 13px;
  color: var(--el-text-color-secondary);
}
.feed-detail-comment__text {
  margin: 0;
  font-size: 14px;
  line-height: 1.6;
  white-space: pre-wrap;
}
.feed-detail-comment__replies {
  list-style: none;
  margin: 8px 0 0;
  padding: 0;
}
</style>
