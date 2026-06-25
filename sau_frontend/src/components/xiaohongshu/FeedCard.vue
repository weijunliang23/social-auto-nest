<template>
  <button type="button" class="feed-card" @click="emitPick">
    <div class="feed-card__media">
      <img
        v-if="item.coverUrl"
        :src="item.coverUrl"
        alt=""
        loading="lazy"
        decoding="async"
        referrerpolicy="no-referrer"
      />
      <div v-else class="feed-card__placeholder" aria-hidden>
        <el-icon><Picture /></el-icon>
      </div>
      <span v-if="isVideo" class="feed-card__badge feed-card__badge--video">
        <el-icon><VideoPlay /></el-icon>
        视频
      </span>
    </div>
    <div class="feed-card__body">
      <p class="feed-card__title" :title="item.title">{{ item.title }}</p>
      <div class="feed-card__meta">
        <img
          v-if="avatarUrl"
          class="feed-card__avatar"
          :src="avatarUrl"
          alt=""
          referrerpolicy="no-referrer"
        />
        <div v-else class="feed-card__avatar feed-card__avatar--empty" aria-hidden />
        <span class="feed-card__name">{{ item.userNickname }}</span>
      </div>
      <div class="feed-card__stats">
        <span class="feed-card__stat">
          <el-icon><Star /></el-icon>
          {{ item.likedCount }}
        </span>
        <span class="feed-card__hint">点击查看</span>
      </div>
    </div>
  </button>
</template>

<script setup>
import { computed } from 'vue'
import { Picture, VideoPlay, Star } from '@element-plus/icons-vue'

const props = defineProps({
  item: { type: Object, required: true },
})

const emit = defineEmits(['pick'])

const isVideo = computed(() => props.item.noteType === 'video')

const avatarUrl = computed(() => {
  const u = props.item.userAvatar
  if (!u) return ''
  return u.startsWith('http://') ? `https://${u.slice(7)}` : u
})

function emitPick() {
  emit('pick', props.item.id, props.item.xsecToken)
}
</script>

<style scoped>
.feed-card {
  display: block;
  width: 100%;
  text-align: left;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 10px;
  overflow: hidden;
  background: var(--el-bg-color);
  cursor: pointer;
  padding: 0;
  transition: box-shadow 0.2s, border-color 0.2s;
}
.feed-card:hover {
  border-color: var(--el-color-primary-light-5);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}
.feed-card__media {
  position: relative;
  aspect-ratio: 3 / 4;
  background: var(--el-fill-color-light);
}
.feed-card__media img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.feed-card__placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--el-text-color-placeholder);
  font-size: 40px;
}
.feed-card__badge {
  position: absolute;
  left: 8px;
  bottom: 8px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
  background: rgba(0, 0, 0, 0.55);
  color: #fff;
}
.feed-card__badge--video .el-icon {
  font-size: 14px;
}
.feed-card__body {
  padding: 10px 12px 12px;
}
.feed-card__title {
  margin: 0 0 8px;
  font-size: 14px;
  font-weight: 600;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  color: var(--el-text-color-primary);
}
.feed-card__meta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}
.feed-card__avatar {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  object-fit: cover;
}
.feed-card__avatar--empty {
  background: var(--el-fill-color);
}
.feed-card__name {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.feed-card__stats {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}
.feed-card__stat {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.feed-card__hint {
  color: var(--el-color-primary);
}
</style>
