<template>
  <div class="publish-record page-view">
    <div class="page-header">
      <h1>发布记录</h1>
    </div>

    <div class="page-panel">
      <div class="page-panel__body">
      <div class="table-toolbar">
        <div class="toolbar-filters">
        <el-input
          v-model="searchKeyword"
          placeholder="输入标题搜索"
          prefix-icon="Search"
          clearable
          @clear="handleSearch"
          @keyup.enter="handleSearch"
        />
        <el-select v-model="filterPlatform" placeholder="平台" clearable @change="handleSearch">
          <el-option label="全部平台" value="" />
          <el-option label="小红书" :value="1" />
          <el-option label="视频号" :value="2" />
          <el-option label="抖音" :value="3" />
          <el-option label="快手" :value="4" />
        </el-select>
        <el-select v-model="filterKind" placeholder="类型" clearable @change="handleSearch">
          <el-option label="全部类型" value="" />
          <el-option label="视频" value="video" />
          <el-option label="图文" value="note" />
        </el-select>
        <el-select v-model="filterStatus" placeholder="状态" clearable @change="handleSearch">
          <el-option label="全部状态" value="" />
          <el-option label="成功" value="success" />
          <el-option label="失败" value="failed" />
        </el-select>
        </div>
        <div class="toolbar-actions">
          <el-button @click="fetchRecords" :loading="isRefreshing">
            <el-icon :class="{ 'is-loading': isRefreshing }"><Refresh /></el-icon>
            <span v-if="isRefreshing">刷新中</span>
            <span v-else>刷新</span>
          </el-button>
          <el-button type="primary" @click="handleSearch">搜索</el-button>
        </div>
      </div>

      <div v-if="records.length > 0" class="record-list">
        <el-table :data="records" class="sau-data-table" stripe v-loading="isRefreshing">
          <el-table-column prop="created_at" label="发布时间" width="180" />
          <el-table-column label="类型" width="80">
            <template #default="scope">
              <el-tag size="small" effect="plain">{{ scope.row.publish_kind_label }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="平台" width="100">
            <template #default="scope">
              <el-tag :type="getPlatformTagType(scope.row.platform_name)" size="small" effect="plain">
                {{ scope.row.platform_name }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="title" label="标题" min-width="200" show-overflow-tooltip />
          <el-table-column label="账号" min-width="160">
            <template #default="scope">
              <el-tag
                v-for="(name, index) in getAccountNames(scope.row)"
                :key="index"
                size="small"
                class="account-tag"
              >
                {{ name }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="素材数" width="80">
            <template #default="scope">
              {{ getFileCount(scope.row) }}
            </template>
          </el-table-column>
          <el-table-column label="状态" width="90">
            <template #default="scope">
              <el-tag :type="scope.row.status === 'success' ? 'success' : 'danger'" size="small">
                {{ scope.row.status_label }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="播放" width="100">
            <template #default="scope">
              {{ formatPlayCount(scope.row) }}
            </template>
          </el-table-column>
          <el-table-column label="互动" min-width="168">
            <template #default="scope">
              {{ formatInteract(scope.row) }}
            </template>
          </el-table-column>
          <el-table-column label="同步" width="108">
            <template #default="scope">
              {{ formatSyncLabel(scope.row) }}
            </template>
          </el-table-column>
          <el-table-column label="操作" width="236" fixed="right" align="right">
            <template #default="scope">
              <div class="table-action-cell">
                <el-button link type="primary" @click="handleViewDetail(scope.row)">详情</el-button>
                <template v-if="canRefreshStats(scope.row)">
                  <el-divider direction="vertical" />
                  <el-tooltip
                    v-if="isEngagementCooling(scope.row)"
                    :content="`冷却中，${cooldownRemainSec(scope.row)} 秒后可再刷`"
                    placement="top"
                  >
                    <span>
                      <el-button link type="primary" disabled>刷新数据</el-button>
                    </span>
                  </el-tooltip>
                  <el-button
                    v-else
                    link
                    type="primary"
                    :loading="isEngagementBusy(scope.row)"
                    :disabled="isEngagementBusy(scope.row)"
                    @click="handleRefreshStats(scope.row)"
                  >
                    刷新数据
                  </el-button>
                </template>
                <template v-if="scope.row.status === 'failed'">
                  <el-divider direction="vertical" />
                  <el-button
                    link
                    type="warning"
                    :loading="retryingRecordId === scope.row.id && !retryingHeaded"
                    :disabled="retryingRecordId === scope.row.id"
                    @click="openRetryConfirmDialog(scope.row)"
                  >
                    重试
                  </el-button>
                </template>
                <el-divider direction="vertical" />
                <el-button link type="danger" @click="handleDelete(scope.row)">删除</el-button>
              </div>
            </template>
          </el-table-column>
        </el-table>
        <div class="pagination-wrapper">
          <el-pagination
            v-model:current-page="currentPage"
            v-model:page-size="pageSize"
            :page-sizes="[10, 20, 50, 100]"
            :total="total"
            layout="total, sizes, prev, pager, next, jumper"
            @size-change="handlePageSizeChange"
            @current-change="handlePageChange"
          />
        </div>
      </div>

      <div v-else-if="!isRefreshing" class="empty-data">
        <el-empty description="暂无发布记录" />
      </div>
      </div>
    </div>

    <el-dialog v-model="detailDialogVisible" title="发布详情" width="640px">
      <div v-if="currentRecord" class="detail-content">
        <div class="detail-row">
          <span class="label">发布时间</span>
          <span>{{ currentRecord.created_at }}</span>
        </div>
        <div class="detail-row">
          <span class="label">类型</span>
          <span>{{ currentRecord.publish_kind_label }}</span>
        </div>
        <div class="detail-row">
          <span class="label">平台</span>
          <span>{{ currentRecord.platform_name }}</span>
        </div>
        <div class="detail-row">
          <span class="label">发布方式</span>
          <span>{{ getPublishBrowserLabel(currentRecord) }}</span>
        </div>
        <div class="detail-row">
          <span class="label">状态</span>
          <el-tag :type="currentRecord.status === 'success' ? 'success' : 'danger'" size="small">
            {{ currentRecord.status_label }}
          </el-tag>
        </div>
        <div class="detail-row">
          <span class="label">标题</span>
          <span>{{ currentRecord.title }}</span>
        </div>
        <div v-if="currentRecord.note_body" class="detail-row">
          <span class="label">正文</span>
          <span class="multiline">{{ currentRecord.note_body }}</span>
        </div>
        <div class="detail-row">
          <span class="label">话题</span>
          <span>
            <template v-if="getTags(currentRecord).length">
              <el-tag v-for="tag in getTags(currentRecord)" :key="tag" size="small" class="topic-tag">#{{ tag }}</el-tag>
            </template>
            <template v-else>无</template>
          </span>
        </div>
        <div class="detail-row">
          <span class="label">账号</span>
          <span>
            <el-tag
              v-for="(name, index) in getAccountNames(currentRecord)"
              :key="index"
              size="small"
              class="account-tag"
            >
              {{ name }}
            </el-tag>
          </span>
        </div>
        <div v-if="currentRecord.status === 'success'" class="detail-row">
          <span class="label">作品链接</span>
          <div class="work-links">
            <template v-if="getWorkLinks(currentRecord).length">
              <div
                v-for="(link, index) in getWorkLinks(currentRecord)"
                :key="`${link.account}-${link.file || index}`"
                class="work-link-item"
              >
                <span>{{ workLinkLabel(currentRecord, link) }}</span>
                <a
                  :href="link.url"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {{ link.kind === 'creator' ? '在视频号助手中查看' : '打开预览' }}
                </a>
                <button type="button" class="work-link-copy" @click="copyWorkLink(link.url)">
                  复制链接
                </button>
              </div>
            </template>
            <span v-else-if="currentRecord.schedule_enabled" class="work-link-empty">
              定时发布暂无公开链接
            </span>
            <span v-else class="work-link-empty">未获取到作品链接</span>
          </div>
        </div>
        <div class="detail-row">
          <span class="label">播放</span>
          <span>{{ formatPlayCount(currentRecord) }}</span>
        </div>
        <div class="detail-row">
          <span class="label">互动</span>
          <span>{{ formatInteract(currentRecord) }}</span>
        </div>
        <div v-if="getWorkStats(currentRecord).length" class="detail-row">
          <span class="label">分账号</span>
          <div class="work-links">
            <div
              v-for="stat in getWorkStats(currentRecord)"
              :key="stat.account"
              class="work-link-item"
            >
              <span>{{ accountLabel(currentRecord, stat.account) }}</span>
              <span>播 {{ formatCount(stat.play_count) }}</span>
              <span>赞 {{ formatCount(stat.like_count) }}</span>
              <span>评 {{ formatCount(stat.comment_count) }}</span>
              <span>藏 {{ formatCount(stat.collect_count) }}</span>
              <span>{{ matchLabel(stat.match) }}</span>
            </div>
          </div>
        </div>
        <div class="detail-row">
          <span class="label">上次同步</span>
          <span>{{ formatSyncTime(currentRecord) }}</span>
        </div>
        <div v-if="currentRecord.engagement_sync?.message" class="detail-row">
          <span class="label">同步说明</span>
          <span class="multiline">{{ currentRecord.engagement_sync.message }}</span>
        </div>
        <div class="detail-row">
          <span class="label">素材文件</span>
          <span class="multiline">{{ getFileList(currentRecord).join('、') || '无' }}</span>
        </div>
        <div class="detail-row">
          <span class="label">定时发布</span>
          <span>{{ currentRecord.schedule_enabled ? '是' : '否' }}</span>
        </div>
        <div v-if="currentRecord.schedule_enabled" class="detail-row">
          <span class="label">定时配置</span>
          <span class="multiline">{{ formatScheduleConfig(currentRecord.schedule_config) }}</span>
        </div>
        <div v-if="hasExtraConfig(currentRecord)" class="detail-row">
          <span class="label">其他配置</span>
          <span class="multiline">{{ formatExtraConfig(currentRecord.extra_config) }}</span>
        </div>
        <div v-if="currentRecord.status_message" class="detail-row">
          <span class="label">状态说明</span>
          <span class="multiline">{{ currentRecord.status_message }}</span>
        </div>
      </div>
      <template #footer>
        <el-button @click="detailDialogVisible = false">关闭</el-button>
        <el-button
          v-if="currentRecord?.status === 'failed'"
          type="primary"
          :loading="retryingRecordId === currentRecord?.id && !retryingHeaded"
          :disabled="retryingRecordId === currentRecord?.id"
          @click="handleRetryFromDetail"
        >
          重试
        </el-button>
        <el-button
          v-if="shouldOfferHeadedRetry(currentRecord)"
          type="success"
          :loading="retryingRecordId === currentRecord?.id && retryingHeaded"
          :disabled="retryingRecordId === currentRecord?.id"
          @click="handleHeadedRetryFromDetail"
        >
          有头浏览器重试
        </el-button>
        <el-button
          v-if="currentRecord && canRefreshStats(currentRecord)"
          type="primary"
          :loading="isEngagementBusy(currentRecord)"
          :disabled="isEngagementBusy(currentRecord) || isEngagementCooling(currentRecord)"
          @click="handleRefreshStats(currentRecord)"
        >
          {{ isEngagementCooling(currentRecord) ? `冷却 ${cooldownRemainSec(currentRecord)}s` : '刷新数据' }}
        </el-button>
      </template>
    </el-dialog>

    <el-dialog
      v-model="retryConfirmVisible"
      title="重试确认"
      width="480px"
      :close-on-click-modal="!retryingRecordId"
      @closed="retryConfirmRecord = null"
    >
      <div v-if="retryConfirmRecord" class="retry-confirm-body">
        <p class="retry-confirm-main">
          确定要重试发布「{{ retryConfirmRecord.title }}」吗？将使用原记录的账号与素材再次提交。
        </p>
        <p class="retry-confirm-hint">若多次失败建议有头重试，成功概率高</p>
      </div>
      <template #footer>
        <el-button
          :disabled="Boolean(retryingRecordId)"
          @click="retryConfirmVisible = false"
        >
          取消
        </el-button>
        <el-button
          type="primary"
          :loading="retryingRecordId === retryConfirmRecord?.id && !retryingHeaded"
          :disabled="Boolean(retryingRecordId)"
          @click="confirmRetryFromDialog(false)"
        >
          确定重试
        </el-button>
        <el-button
          v-if="shouldOfferHeadedRetry(retryConfirmRecord)"
          type="success"
          :loading="retryingRecordId === retryConfirmRecord?.id && retryingHeaded"
          :disabled="Boolean(retryingRecordId)"
          @click="confirmRetryFromDialog(true)"
        >
          有头重试
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { Refresh } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { accountApi } from '@/api/account'
import { publishRecordApi } from '@/api/publishRecord'
import { useAccountStore } from '@/stores/account'
import { waitAndHandlePublishJob } from '@/utils/runPublishJob'
import { sleep } from '@/utils/publishCookieRecovery'
import {
  getPublishBrowserLabel,
  shouldOfferHeadedRetry
} from '@/utils/publishBrowserMode'

const router = useRouter()
const accountStore = useAccountStore()

const records = ref([])
const total = ref(0)
const currentPage = ref(1)
const pageSize = ref(20)
const searchKeyword = ref('')
const filterPlatform = ref('')
const filterKind = ref('')
const filterStatus = ref('')
const isRefreshing = ref(false)
const detailDialogVisible = ref(false)
const currentRecord = ref(null)
const retryingRecordId = ref(null)
const retryingHeaded = ref(false)
const retryConfirmVisible = ref(false)
const retryConfirmRecord = ref(null)
const localSyncing = ref({})
const nowTick = ref(Date.now())
let nowTimer = null
const ENGAGEMENT_COOLDOWN_MS = 3 * 60 * 1000

const platformTagMap = {
  '小红书': 'info',
  '视频号': 'warning',
  '抖音': 'danger',
  '快手': 'success',
}

const getPlatformTagType = (platform) => platformTagMap[platform] || 'info'

const getAccountNames = (record) => {
  if (Array.isArray(record.account_names) && record.account_names.length) {
    return record.account_names
  }
  if (Array.isArray(record.account_list)) {
    return record.account_list
  }
  return []
}

const getWorkLinks = (record) => {
  return Array.isArray(record.work_links) ? record.work_links : []
}

const workLinkLabel = (record, link) => {
  const name = accountLabel(record, link.account)
  return link.file ? `${name} · ${link.file}` : name
}

const accountLabel = (record, account) => {
  const accounts = Array.isArray(record.account_list) ? record.account_list : []
  const names = getAccountNames(record)
  const index = accounts.indexOf(account)
  return index >= 0 && names[index] ? names[index] : account
}

const getWorkStats = (record) => {
  return Array.isArray(record?.work_stats) ? record.work_stats : []
}

const formatCount = (value) => {
  if (value == null || value === '') return '—'
  const num = Number(value)
  if (!Number.isFinite(num)) return '—'
  return num.toLocaleString('zh-CN')
}

const getStatsTotal = (record) => {
  return record?.work_stats_total && typeof record.work_stats_total === 'object'
    ? record.work_stats_total
    : {}
}

const formatPlayCount = (record) => {
  if (record.platform_type === 2 || record.engagement_supported === false) {
    return '暂不支持'
  }
  return formatCount(getStatsTotal(record).play_count)
}

const formatInteract = (record) => {
  if (record.platform_type === 2 || record.engagement_supported === false) {
    return '暂不支持'
  }
  const total = getStatsTotal(record)
  const parts = []
  if (total.like_count != null) parts.push(`赞 ${formatCount(total.like_count)}`)
  if (total.comment_count != null) parts.push(`评 ${formatCount(total.comment_count)}`)
  if (total.collect_count != null) parts.push(`藏 ${formatCount(total.collect_count)}`)
  return parts.length ? parts.join(' · ') : '—'
}

const matchLabel = (match) => {
  if (match === 'id') return '作品ID'
  if (match === 'title') return '标题匹配'
  if (match === 'unmatched') return '未匹配'
  return '—'
}

const formatSyncTime = (record) => {
  const finished = record.engagement_sync?.finished_at
  if (!finished) return '—'
  try {
    return new Date(finished).toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return '—'
  }
}

const formatSyncLabel = (record) => {
  if (record.platform_type === 2 || record.engagement_supported === false) {
    return '暂不支持'
  }
  const status = record.engagement_sync?.status
  if (status === 'queued') return '排队中'
  if (status === 'running' || localSyncing.value[record.id]) return '同步中'
  if (status === 'failed') return '失败'
  if (status === 'ok') return formatSyncTime(record)
  return '—'
}

const canRefreshStats = (record) => {
  return record.status === 'success' && record.platform_type !== 2 && record.engagement_supported !== false
}

const isEngagementBusy = (record) => {
  const status = record.engagement_sync?.status
  return status === 'queued' || status === 'running' || Boolean(localSyncing.value[record.id])
}

const cooldownRemainSec = (record) => {
  void nowTick.value
  const requested = record.engagement_sync?.requested_at
  if (requested) {
    const remain = ENGAGEMENT_COOLDOWN_MS - (Date.now() - new Date(requested).getTime())
    return remain > 0 ? Math.ceil(remain / 1000) : 0
  }
  return Number(record.engagement_sync?.cooldown_remain_sec || 0)
}

const isEngagementCooling = (record) => {
  return !isEngagementBusy(record) && cooldownRemainSec(record) > 0
}

const applyRecord = (row) => {
  if (!row?.id) return
  if (currentRecord.value?.id === row.id) {
    currentRecord.value = row
  }
  const idx = records.value.findIndex((item) => item.id === row.id)
  if (idx !== -1) {
    records.value[idx] = row
  }
}

const pollEngagement = async (recordId, { notify = false } = {}) => {
  localSyncing.value = { ...localSyncing.value, [recordId]: true }
  const started = Date.now()
  try {
    while (Date.now() - started < 10 * 60 * 1000) {
      const res = await publishRecordApi.getPublishRecord(recordId)
      if (res.code !== 200 || !res.data) {
        break
      }
      applyRecord(res.data)
      const status = res.data.engagement_sync?.status
      if (status === 'ok' || status === 'failed' || status === 'unsupported') {
        if (notify) {
          if (status === 'ok') {
            ElMessage.success(res.data.engagement_sync?.message || '已同步播放与互动')
          } else if (status === 'failed') {
            ElMessage.error(res.data.engagement_sync?.message || '刷新失败')
          }
        }
        break
      }
      await sleep(2000)
    }
  } catch (error) {
    console.error('轮询播放互动出错:', error)
  } finally {
    const next = { ...localSyncing.value }
    delete next[recordId]
    localSyncing.value = next
  }
}

const handleRefreshStats = async (record) => {
  if (!canRefreshStats(record) || isEngagementBusy(record) || isEngagementCooling(record)) {
    return
  }
  try {
    const res = await publishRecordApi.refreshPublishStats(record.id)
    if (res.data) {
      applyRecord(res.data)
    }
    ElMessage.success(res.msg || '数据刷新已提交')
    await pollEngagement(record.id, { notify: true })
  } catch (error) {
    console.error('刷新播放互动出错:', error)
  }
}

const copyWorkLink = async (url) => {
  if (!url) {
    ElMessage.warning('暂无可复制的链接')
    return
  }
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(url)
    } else {
      const input = document.createElement('textarea')
      input.value = url
      input.setAttribute('readonly', '')
      input.style.position = 'fixed'
      input.style.left = '-9999px'
      document.body.appendChild(input)
      input.select()
      document.execCommand('copy')
      document.body.removeChild(input)
    }
    ElMessage.success('链接已复制')
  } catch {
    ElMessage.error('复制失败，请手动复制')
  }
}

const getFileList = (record) => {
  return Array.isArray(record.file_list) ? record.file_list : []
}

const getFileCount = (record) => getFileList(record).length

const getTags = (record) => {
  return Array.isArray(record.tags) ? record.tags : []
}

const formatScheduleConfig = (config) => {
  if (!config || typeof config !== 'object') return '无'
  const parts = []
  if (config.videosPerDay != null) parts.push(`每天 ${config.videosPerDay} 条`)
  if (Array.isArray(config.dailyTimes) && config.dailyTimes.length) {
    parts.push(`时间 ${config.dailyTimes.join('、')}`)
  }
  if (config.startDays != null) {
    parts.push(config.startDays === 0 ? '明天开始' : '后天开始')
  }
  return parts.join('；') || '无'
}

const formatExtraConfig = (config) => {
  if (!config || typeof config !== 'object') return '无'
  const parts = []
  if (config.isDraft) parts.push('保存草稿')
  if (config.category) parts.push('声明原创')
  if (config.productTitle) parts.push(`商品：${config.productTitle}`)
  if (config.productLink) parts.push(`链接：${config.productLink}`)
  if (config.thumbnail) parts.push(`封面：${config.thumbnail}`)
  return parts.join('；') || '无'
}

const hasExtraConfig = (record) => {
  const config = record.extra_config
  if (!config || typeof config !== 'object') return false
  return Boolean(
    config.isDraft ||
    config.category ||
    config.productTitle ||
    config.productLink ||
    config.thumbnail
  )
}

const fetchRecords = async () => {
  isRefreshing.value = true
  try {
    const params = {
      page: currentPage.value,
      limit: pageSize.value,
    }
    if (searchKeyword.value.trim()) params.keyword = searchKeyword.value.trim()
    if (filterPlatform.value !== '') params.platform = filterPlatform.value
    if (filterKind.value) params.kind = filterKind.value
    if (filterStatus.value) params.status = filterStatus.value

    const response = await publishRecordApi.getPublishRecords(params)
    if (response.code === 200) {
      const data = response.data
      if (Array.isArray(data)) {
        records.value = data
        total.value = data.length
      } else {
        records.value = data?.list || []
        total.value = data?.total ?? 0
        if (data?.page) currentPage.value = data.page
      }
    } else {
      ElMessage.error(response.msg || '获取发布记录失败')
    }
  } catch (error) {
    console.error('获取发布记录出错:', error)
    ElMessage.error('获取发布记录失败')
  } finally {
    isRefreshing.value = false
  }
}

const handlePageChange = (page) => {
  currentPage.value = page
  fetchRecords()
}

const handlePageSizeChange = (size) => {
  pageSize.value = size
  currentPage.value = 1
  fetchRecords()
}

const handleSearch = () => {
  currentPage.value = 1
  fetchRecords()
}

const handleViewDetail = (record) => {
  currentRecord.value = record
  detailDialogVisible.value = true
}

const ensureAccountsLoaded = async () => {
  if (accountStore.accounts.length > 0) {
    return
  }
  const res = await accountApi.getAccounts()
  if (res.code === 200 && res.data) {
    accountStore.setAccounts(res.data)
  }
}

const refreshRecordInView = async (recordId) => {
  const detailRes = await publishRecordApi.getPublishRecord(recordId)
  if (detailRes.code === 200 && detailRes.data) {
    if (currentRecord.value?.id === recordId) {
      currentRecord.value = detailRes.data
    }
    const idx = records.value.findIndex((r) => r.id === recordId)
    if (idx !== -1) {
      records.value[idx] = detailRes.data
    }
  }
}

const runRetry = async (record, { browserPublish = false } = {}) => {
  if (record.status !== 'failed') {
    return false
  }
  await ensureAccountsLoaded()
  retryingRecordId.value = record.id
  retryingHeaded.value = browserPublish
  try {
    const retryRes = await publishRecordApi.retryPublishRecord(record.id, {
      browserPublish
    })
    if (retryRes.code !== 200) {
      ElMessage.error(retryRes.msg || '重试提交失败')
      return false
    }
    const recordId = retryRes.data?.recordId || record.id
    const result = await waitAndHandlePublishJob(recordId, {
      accountStore,
      router,
      successLabel: browserPublish ? '有头浏览器重试成功' : '重试发布成功'
    })
    await fetchRecords()
    await refreshRecordInView(record.id)
    return result.ok
  } catch (error) {
    console.error('重试发布出错:', error)
    ElMessage.error(error.message || '重试失败')
    await fetchRecords()
    return false
  } finally {
    retryingRecordId.value = null
    retryingHeaded.value = false
  }
}

const openRetryConfirmDialog = (record) => {
  retryConfirmRecord.value = record
  retryConfirmVisible.value = true
}

const confirmRetryFromDialog = async (browserPublish) => {
  const record = retryConfirmRecord.value
  if (!record) {
    return
  }
  const ok = await runRetry(record, { browserPublish })
  if (ok) {
    retryConfirmVisible.value = false
  }
}

const handleRetryFromDetail = async () => {
  if (!currentRecord.value) {
    return
  }
  await runRetry(currentRecord.value)
}

const handleHeadedRetryFromDetail = async () => {
  if (!currentRecord.value) {
    return
  }
  try {
    await ElMessageBox.confirm(
      `将使用有头浏览器（可视化）重新发布「${currentRecord.value.title}」，会弹出 Chrome 窗口，是否继续？`,
      '有头浏览器重试',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    await runRetry(currentRecord.value, { browserPublish: true })
  } catch (error) {
    if (error !== 'cancel') {
      console.error('有头重试确认出错:', error)
    }
  }
}

const handleDelete = async (record) => {
  try {
    await ElMessageBox.confirm(`确定删除发布记录「${record.title}」吗？`, '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    })

    const response = await publishRecordApi.deletePublishRecord(record.id)
    if (response.code === 200) {
      ElMessage.success('删除成功')
      await fetchRecords()
    } else {
      ElMessage.error(response.msg || '删除失败')
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除发布记录出错:', error)
      ElMessage.error('删除失败')
    }
  }
}

onMounted(async () => {
  nowTimer = setInterval(() => {
    nowTick.value = Date.now()
  }, 1000)
  await fetchRecords()
  for (const row of records.value) {
    const status = row.engagement_sync?.status
    if (status === 'queued' || status === 'running') {
      void pollEngagement(row.id)
    }
  }
})

onBeforeUnmount(() => {
  if (nowTimer) {
    clearInterval(nowTimer)
    nowTimer = null
  }
})
</script>

<style lang="scss" scoped>
@use '@/styles/variables.scss' as *;

.publish-record {
  .page-header {
    margin-bottom: 20px;

    h1 {
      font-size: 24px;
      font-weight: 500;
      color: $text-primary;
      margin: 0;
    }
  }

  .record-list-container {
    background-color: #fff;
    border-radius: 4px;
    box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
    padding: 20px;
  }

  .record-search {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    margin-bottom: 20px;
    align-items: center;

    .el-input {
      width: 220px;
    }

    .el-select {
      width: 130px;
    }

    .action-buttons {
      display: flex;
      gap: 10px;
      margin-left: auto;
    }
  }

  .account-tag,
  .topic-tag {
    margin-right: 6px;
    margin-bottom: 4px;
  }

  .empty-data {
    padding: 40px 0;
  }

  .pagination-wrapper {
    display: flex;
    justify-content: flex-end;
    margin-top: 20px;
  }

  .retry-confirm-body {
    .retry-confirm-main {
      margin: 0 0 12px;
      line-height: 1.6;
      color: $text-primary;
    }

    .retry-confirm-hint {
      margin: 0;
      font-size: 12px;
      line-height: 1.5;
      color: $text-secondary;
    }
  }

  .detail-content {
    .detail-row {
      display: flex;
      gap: 12px;
      margin-bottom: 14px;
      line-height: 1.6;

      .label {
        flex-shrink: 0;
        width: 88px;
        color: $text-secondary;
      }

      .multiline {
        white-space: pre-wrap;
        word-break: break-all;
      }

      .work-links {
        display: flex;
        flex-direction: column;
        gap: 8px;
        min-width: 0;
      }

      .work-link-item {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 8px;

        a,
        .work-link-copy {
          color: $primary-color;
          text-decoration: none;
          background: none;
          border: none;
          padding: 0;
          font-size: inherit;
          line-height: inherit;
          cursor: pointer;

          &:hover {
            text-decoration: underline;
          }
        }
      }

      .work-link-empty {
        color: $text-secondary;
      }
    }
  }
}

@media (max-width: 767px) {
  .publish-record {
    .page-header h1 {
      font-size: 20px;
    }

    .record-list-container {
      padding: 12px;
    }

    .record-search {
      flex-direction: column;
      align-items: stretch;

      .el-input,
      .el-select {
        width: 100% !important;
      }

      .action-buttons {
        margin-left: 0;
        width: 100%;

        .el-button {
          flex: 1;
        }
      }
    }

    .record-list {
      overflow-x: auto;
      -webkit-overflow-scrolling: touch;

      :deep(.el-table) {
        min-width: 1180px;
      }
    }

    .pagination-wrapper {
      justify-content: center;
    }

    .detail-content .detail-row {
      flex-direction: column;
      gap: 4px;

      .label {
        width: auto;
        font-weight: 500;
        color: $text-primary;
      }
    }
  }
}
</style>
