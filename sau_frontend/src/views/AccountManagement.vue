<template>
  <div class="account-management">
    <div class="page-header">
      <h1>账号管理</h1>
    </div>

    <div class="account-tabs">
      <el-tabs v-model="activeTab" class="account-tabs-nav">
        <el-tab-pane label="全部" name="all">
          <div class="account-list-container">
            <div class="account-search">
              <el-input v-model="searchKeyword" placeholder="输入名称或账号搜索" prefix-icon="Search" clearable
                @clear="handleSearch" @input="handleSearch" />
              <div class="action-buttons">
                <el-button type="primary" @click="handleAddAccount">添加账号</el-button>
                <el-button type="info" @click="refreshAllAccounts" :loading="appStore.isAccountRefreshing"
                  :disabled="appStore.isAccountRefreshing">
                  <el-icon :class="{ 'is-loading': appStore.isAccountRefreshing }">
                    <Refresh />
                  </el-icon>
                  <span v-if="appStore.isAccountRefreshing">刷新中</span>
                </el-button>
              </div>
            </div>

            <div v-if="filteredAccounts.length > 0" class="account-list">
              <el-table :data="filteredAccounts" style="width: 100%">
                <el-table-column label="头像" width="80">
                  <template #default="scope">
                    <el-avatar :src="getDefaultAvatar(scope.row.name)" :size="40" />
                  </template>
                </el-table-column>
                <el-table-column prop="name" label="名称" width="180" />
                <el-table-column prop="platform" label="平台">
                  <template #default="scope">
                    <el-tag :type="getPlatformTagType(scope.row.platform)" effect="plain">
                      {{ scope.row.platform }}
                    </el-tag>
                  </template>
                </el-table-column>
                <el-table-column prop="status" label="状态">
                  <template #default="scope">
                    <el-tag :type="getStatusTagType(scope.row.status)" effect="plain"
                      :class="{ 'clickable-status': isStatusClickable(scope.row.status) }"
                      @click="handleStatusClick(scope.row)">
                      <el-icon :class="scope.row.status === '验证中' ? 'is-loading' : ''"
                        v-if="scope.row.status === '验证中'">
                        <Loading />
                      </el-icon>
                      {{ scope.row.status }}
                    </el-tag>
                  </template>
                </el-table-column>
                <el-table-column label="操作">
                  <template #default="scope">
                    <el-button size="small" @click="handleEdit(scope.row)">编辑</el-button>
                    <el-button size="small" type="warning" :icon="Refresh"
                      :loading="!!validatingAccountIds[scope.row.id]" @click="handleRefreshAccountStatus(scope.row)">
                      刷新状态
                    </el-button>
                    <el-button size="small" type="primary" :icon="Download"
                      @click="handleDownloadCookie(scope.row)">下载Cookie</el-button>
                    <el-button size="small" type="info" :icon="Upload"
                      @click="handleUploadCookie(scope.row)">上传Cookie</el-button>
                    <el-button size="small" type="danger" @click="handleDelete(scope.row)">删除</el-button>
                  </template>
                </el-table-column>
              </el-table>
            </div>

            <div v-else class="empty-data">
              <el-empty description="暂无账号数据" />
            </div>
          </div>
        </el-tab-pane>

        <el-tab-pane label="快手" name="kuaishou">
          <div class="account-list-container">
            <div class="account-search">
              <el-input v-model="searchKeyword" placeholder="输入名称或账号搜索" prefix-icon="Search" clearable
                @clear="handleSearch" @input="handleSearch" />
              <div class="action-buttons">
                <el-button type="primary" @click="handleAddAccount">添加账号</el-button>
                <el-button type="info" @click="refreshAllAccounts" :loading="appStore.isAccountRefreshing"
                  :disabled="appStore.isAccountRefreshing">
                  <el-icon :class="{ 'is-loading': appStore.isAccountRefreshing }">
                    <Refresh />
                  </el-icon>
                  <span v-if="appStore.isAccountRefreshing">刷新中</span>
                </el-button>
              </div>
            </div>

            <div v-if="filteredKuaishouAccounts.length > 0" class="account-list">
              <el-table :data="filteredKuaishouAccounts" style="width: 100%">
                <el-table-column label="头像" width="80">
                  <template #default="scope">
                    <el-avatar :src="getDefaultAvatar(scope.row.name)" :size="40" />
                  </template>
                </el-table-column>
                <el-table-column prop="name" label="名称" width="180" />
                <el-table-column prop="platform" label="平台">
                  <template #default="scope">
                    <el-tag :type="getPlatformTagType(scope.row.platform)" effect="plain">
                      {{ scope.row.platform }}
                    </el-tag>
                  </template>
                </el-table-column>
                <el-table-column prop="status" label="状态">
                  <template #default="scope">
                    <el-tag :type="getStatusTagType(scope.row.status)" effect="plain"
                      :class="{ 'clickable-status': isStatusClickable(scope.row.status) }"
                      @click="handleStatusClick(scope.row)">
                      <el-icon :class="scope.row.status === '验证中' ? 'is-loading' : ''"
                        v-if="scope.row.status === '验证中'">
                        <Loading />
                      </el-icon>
                      {{ scope.row.status }}
                    </el-tag>
                  </template>
                </el-table-column>
                <el-table-column label="操作">
                  <template #default="scope">
                    <el-button size="small" @click="handleEdit(scope.row)">编辑</el-button>
                    <el-button size="small" type="warning" :icon="Refresh"
                      :loading="!!validatingAccountIds[scope.row.id]" @click="handleRefreshAccountStatus(scope.row)">
                      刷新状态
                    </el-button>
                    <el-button size="small" type="primary" :icon="Download"
                      @click="handleDownloadCookie(scope.row)">下载Cookie</el-button>
                    <el-button size="small" type="info" :icon="Upload"
                      @click="handleUploadCookie(scope.row)">上传Cookie</el-button>
                    <el-button size="small" type="danger" @click="handleDelete(scope.row)">删除</el-button>
                  </template>
                </el-table-column>
              </el-table>
            </div>

            <div v-else class="empty-data">
              <el-empty description="暂无快手账号数据" />
            </div>
          </div>
        </el-tab-pane>

        <el-tab-pane label="抖音" name="douyin">
          <div class="account-list-container">
            <div class="account-search">
              <el-input v-model="searchKeyword" placeholder="输入名称或账号搜索" prefix-icon="Search" clearable
                @clear="handleSearch" @input="handleSearch" />
              <div class="action-buttons">
                <el-button type="primary" @click="handleAddAccount">添加账号</el-button>
                <el-button type="info" @click="refreshAllAccounts" :loading="appStore.isAccountRefreshing"
                  :disabled="appStore.isAccountRefreshing">
                  <el-icon :class="{ 'is-loading': appStore.isAccountRefreshing }">
                    <Refresh />
                  </el-icon>
                  <span v-if="appStore.isAccountRefreshing">刷新中</span>
                </el-button>
              </div>
            </div>

            <div v-if="filteredDouyinAccounts.length > 0" class="account-list">
              <el-table :data="filteredDouyinAccounts" style="width: 100%">
                <el-table-column label="头像" width="80">
                  <template #default="scope">
                    <el-avatar :src="getDefaultAvatar(scope.row.name)" :size="40" />
                  </template>
                </el-table-column>
                <el-table-column prop="name" label="名称" width="180" />
                <el-table-column prop="platform" label="平台">
                  <template #default="scope">
                    <el-tag :type="getPlatformTagType(scope.row.platform)" effect="plain">
                      {{ scope.row.platform }}
                    </el-tag>
                  </template>
                </el-table-column>
                <el-table-column prop="status" label="状态">
                  <template #default="scope">
                    <el-tag :type="getStatusTagType(scope.row.status)" effect="plain"
                      :class="{ 'clickable-status': isStatusClickable(scope.row.status) }"
                      @click="handleStatusClick(scope.row)">
                      <el-icon :class="scope.row.status === '验证中' ? 'is-loading' : ''"
                        v-if="scope.row.status === '验证中'">
                        <Loading />
                      </el-icon>
                      {{ scope.row.status }}
                    </el-tag>
                  </template>
                </el-table-column>
                <el-table-column label="操作">
                  <template #default="scope">
                    <el-button size="small" @click="handleEdit(scope.row)">编辑</el-button>
                    <el-button size="small" type="warning" :icon="Refresh"
                      :loading="!!validatingAccountIds[scope.row.id]" @click="handleRefreshAccountStatus(scope.row)">
                      刷新状态
                    </el-button>
                    <el-button size="small" type="primary" :icon="Download"
                      @click="handleDownloadCookie(scope.row)">下载Cookie</el-button>
                    <el-button size="small" type="info" :icon="Upload"
                      @click="handleUploadCookie(scope.row)">上传Cookie</el-button>
                    <el-button size="small" type="danger" @click="handleDelete(scope.row)">删除</el-button>
                  </template>
                </el-table-column>
              </el-table>
            </div>

            <div v-else class="empty-data">
              <el-empty description="暂无抖音账号数据" />
            </div>
          </div>
        </el-tab-pane>

        <el-tab-pane label="视频号" name="channels">
          <div class="account-list-container">
            <div class="account-search">
              <el-input v-model="searchKeyword" placeholder="输入名称或账号搜索" prefix-icon="Search" clearable
                @clear="handleSearch" @input="handleSearch" />
              <div class="action-buttons">
                <el-button type="primary" @click="handleAddAccount">添加账号</el-button>
                <el-button type="info" @click="refreshAllAccounts" :loading="appStore.isAccountRefreshing"
                  :disabled="appStore.isAccountRefreshing">
                  <el-icon :class="{ 'is-loading': appStore.isAccountRefreshing }">
                    <Refresh />
                  </el-icon>
                  <span v-if="appStore.isAccountRefreshing">刷新中</span>
                </el-button>
              </div>
            </div>

            <div v-if="filteredChannelsAccounts.length > 0" class="account-list">
              <el-table :data="filteredChannelsAccounts" style="width: 100%">
                <el-table-column label="头像" width="80">
                  <template #default="scope">
                    <el-avatar :src="getDefaultAvatar(scope.row.name)" :size="40" />
                  </template>
                </el-table-column>
                <el-table-column prop="name" label="名称" width="180" />
                <el-table-column prop="platform" label="平台">
                  <template #default="scope">
                    <el-tag :type="getPlatformTagType(scope.row.platform)" effect="plain">
                      {{ scope.row.platform }}
                    </el-tag>
                  </template>
                </el-table-column>
                <el-table-column prop="status" label="状态">
                  <template #default="scope">
                    <el-tag :type="getStatusTagType(scope.row.status)" effect="plain"
                      :class="{ 'clickable-status': isStatusClickable(scope.row.status) }"
                      @click="handleStatusClick(scope.row)">
                      <el-icon :class="scope.row.status === '验证中' ? 'is-loading' : ''"
                        v-if="scope.row.status === '验证中'">
                        <Loading />
                      </el-icon>
                      {{ scope.row.status }}
                    </el-tag>
                  </template>
                </el-table-column>
                <el-table-column label="操作">
                  <template #default="scope">
                    <el-button size="small" @click="handleEdit(scope.row)">编辑</el-button>
                    <el-button size="small" type="warning" :icon="Refresh"
                      :loading="!!validatingAccountIds[scope.row.id]" @click="handleRefreshAccountStatus(scope.row)">
                      刷新状态
                    </el-button>
                    <el-button size="small" type="primary" :icon="Download"
                      @click="handleDownloadCookie(scope.row)">下载Cookie</el-button>
                    <el-button size="small" type="info" :icon="Upload"
                      @click="handleUploadCookie(scope.row)">上传Cookie</el-button>
                    <el-button size="small" type="danger" @click="handleDelete(scope.row)">删除</el-button>
                  </template>
                </el-table-column>
              </el-table>
            </div>

            <div v-else class="empty-data">
              <el-empty description="暂无视频号账号数据" />
            </div>
          </div>
        </el-tab-pane>

        <el-tab-pane label="小红书" name="xiaohongshu">
          <div class="account-list-container">
            <div class="account-search">
              <el-input v-model="searchKeyword" placeholder="输入名称或账号搜索" prefix-icon="Search" clearable
                @clear="handleSearch" @input="handleSearch" />
              <div class="action-buttons">
                <el-button type="primary" @click="handleAddAccount">添加账号</el-button>
                <el-button type="info" @click="refreshAllAccounts" :loading="appStore.isAccountRefreshing"
                  :disabled="appStore.isAccountRefreshing">
                  <el-icon :class="{ 'is-loading': appStore.isAccountRefreshing }">
                    <Refresh />
                  </el-icon>
                  <span v-if="appStore.isAccountRefreshing">刷新中</span>
                </el-button>
              </div>
            </div>

            <div v-if="filteredXiaohongshuAccounts.length > 0" class="account-list">
              <el-table :data="filteredXiaohongshuAccounts" style="width: 100%">
                <el-table-column label="头像" width="80">
                  <template #default="scope">
                    <el-avatar :src="getDefaultAvatar(scope.row.name)" :size="40" />
                  </template>
                </el-table-column>
                <el-table-column prop="name" label="名称" width="180" />
                <el-table-column prop="platform" label="平台">
                  <template #default="scope">
                    <el-tag :type="getPlatformTagType(scope.row.platform)" effect="plain">
                      {{ scope.row.platform }}
                    </el-tag>
                  </template>
                </el-table-column>
                <el-table-column prop="status" label="状态">
                  <template #default="scope">
                    <el-tag :type="getStatusTagType(scope.row.status)" effect="plain"
                      :class="{ 'clickable-status': isStatusClickable(scope.row.status) }"
                      @click="handleStatusClick(scope.row)">
                      <el-icon :class="scope.row.status === '验证中' ? 'is-loading' : ''"
                        v-if="scope.row.status === '验证中'">
                        <Loading />
                      </el-icon>
                      {{ scope.row.status }}
                    </el-tag>
                  </template>
                </el-table-column>
                <el-table-column label="操作">
                  <template #default="scope">
                    <el-button size="small" @click="handleEdit(scope.row)">编辑</el-button>
                    <el-button size="small" type="warning" :icon="Refresh"
                      :loading="!!validatingAccountIds[scope.row.id]" @click="handleRefreshAccountStatus(scope.row)">
                      刷新状态
                    </el-button>
                    <el-button size="small" type="primary" :icon="Download"
                      @click="handleDownloadCookie(scope.row)">下载Cookie</el-button>
                    <el-button size="small" type="info" :icon="Upload"
                      @click="handleUploadCookie(scope.row)">上传Cookie</el-button>
                    <el-button size="small" type="danger" @click="handleDelete(scope.row)">删除</el-button>
                  </template>
                </el-table-column>
              </el-table>
            </div>

            <div v-else class="empty-data">
              <el-empty description="暂无小红书账号数据" />
            </div>
          </div>
        </el-tab-pane>
      </el-tabs>
    </div>

    <!-- 添加/编辑账号对话框 -->
    <el-dialog v-model="dialogVisible" :title="dialogType === 'add' ? '添加账号' : '编辑账号'" width="500px"
      :close-on-click-modal="false" :close-on-press-escape="!sseConnecting" :show-close="!sseConnecting">
      <div
        class="account-dialog-body"
        v-loading="headlessLoginPreparing"
        element-loading-text="正在启动无浏览器登录，请稍候…"
      >
      <el-form :model="accountForm" label-width="80px" :rules="rules" ref="accountFormRef">
        <el-form-item label="平台" prop="platform">
          <el-select v-model="accountForm.platform" placeholder="请选择平台" style="width: 100%"
            :disabled="dialogType === 'edit' || sseConnecting">
            <el-option label="快手" value="快手" />
            <el-option label="抖音" value="抖音" />
            <el-option label="视频号" value="视频号" />
            <el-option label="小红书" value="小红书" />
          </el-select>
        </el-form-item>
        <el-form-item label="名称" prop="name">
          <el-input v-model="accountForm.name" placeholder="请输入账号名称" :disabled="sseConnecting" />
        </el-form-item>
        <el-form-item v-if="dialogType === 'add' && !sseConnecting" label="浏览器">
          <el-switch v-model="accountForm.browserLogin" active-text="有头浏览器" inactive-text="无浏览器" />
          <p class="browser-login-tip">
            无浏览器：应用内扫码登录；<br />有头浏览器：打开官网扫码登录。<br />若无浏览器扫码超时，请改选有头浏览器重试。
          </p>
        </el-form-item>

        <!-- 二维码显示区域 -->
        <div v-if="sseConnecting" class="qrcode-container">
          <div v-if="qrCodeData && !loginStatus" class="qrcode-wrapper">
            <p class="qrcode-tip">请使用对应平台APP扫描二维码登录</p>
            <img :src="qrCodeData" alt="登录二维码" class="qrcode-image" />
          </div>
          <div v-else-if="!qrCodeData && !loginStatus" class="loading-wrapper">
            <el-icon class="is-loading">
              <Refresh />
            </el-icon>
            <span>请求中...</span>
          </div>
          <div v-else-if="loginStatus === '200'" class="success-wrapper">
            <el-icon>
              <CircleCheckFilled />
            </el-icon>
            <span>添加成功</span>
          </div>
          <div v-else-if="loginStatus === '500'" class="error-wrapper">
            <el-icon>
              <CircleCloseFilled />
            </el-icon>
            <span>添加失败，请稍后再试</span>
          </div>
        </div>
      </el-form>
      </div>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="dialogVisible = false">取消</el-button>
          <el-button type="primary" @click="submitAccountForm" :loading="sseConnecting" :disabled="sseConnecting">
            {{ sseConnecting ? '请求中' : '确认' }}
          </el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Refresh, CircleCheckFilled, CircleCloseFilled, Download, Upload, Loading } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { accountApi } from '@/api/account'
import { useAccountStore } from '@/stores/account'
import { useAppStore } from '@/stores/app'
import { http } from '@/utils/request'
import { openAuthenticatedSse } from '@/utils/sse'

// 获取账号状态管理
const accountStore = useAccountStore()
// 获取应用状态管理
const appStore = useAppStore()
const route = useRoute()
const router = useRouter()

// 当前激活的标签页
const activeTab = ref('all')

// 搜索关键词
const searchKeyword = ref('')

// 单行刷新 loading 状态
const validatingAccountIds = ref({})

// 获取账号列表（不校验 Cookie，快速加载）
const loadAccounts = async () => {
  try {
    const res = await accountApi.getAccounts()
    if (res.code === 200 && res.data) {
      accountStore.setAccounts(res.data)
      if (appStore.isFirstTimeAccountManagement) {
        appStore.setAccountManagementVisited()
      }
    } else {
      ElMessage.error('获取账号数据失败')
    }
  } catch (error) {
    console.error('获取账号数据失败:', error)
    ElMessage.error('获取账号数据失败')
  }
}

// SSE 批量校验连接
let validateAccountsSse = null

const closeValidateAccountsSse = () => {
  if (validateAccountsSse) {
    validateAccountsSse.close()
    validateAccountsSse = null
  }
}

// 刷新全部账号状态（SSE 逐条推送）
const refreshAllAccounts = () => {
  if (appStore.isAccountRefreshing) return

  appStore.setAccountRefreshing(true)
  closeValidateAccountsSse()

  const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5409'
  const url = `${baseUrl}/validateAccounts`

  validateAccountsSse = openAuthenticatedSse(url, {
    onMessage: (event) => {
      const data = event.data
      if (data === 'done') {
        closeValidateAccountsSse()
        appStore.setAccountRefreshing(false)
        ElMessage.success('全部账号状态已更新')
        return
      }

      try {
        const payload = JSON.parse(data)
        if (payload.error && payload.id) {
          console.error(`账号 ${payload.id} 校验失败:`, payload.error)
          return
        }
        if (payload.id !== undefined && payload.status !== undefined) {
          accountStore.updateAccountStatus(payload.id, payload.status)
        }
      } catch (error) {
        console.error('解析校验结果失败:', error)
      }
    },
    onError: (error) => {
      console.error('批量刷新账号状态失败:', error)
      ElMessage.error(error.message || '批量刷新失败')
      closeValidateAccountsSse()
      appStore.setAccountRefreshing(false)
    },
  })
}

// 刷新单个账号状态
const handleRefreshAccountStatus = async (row) => {
  if (validatingAccountIds.value[row.id] || appStore.isAccountRefreshing) {
    return
  }

  validatingAccountIds.value[row.id] = true
  accountStore.setAccountValidating(row.id)

  try {
    const res = await accountApi.validateAccount(row.id)
    if (res.code === 200 && res.data) {
      accountStore.updateAccountStatus(row.id, res.data[4])
      ElMessage.success('状态已更新')
    } else {
      ElMessage.error(res.msg || '刷新状态失败')
    }
  } catch (error) {
    console.error('刷新账号状态失败:', error)
  } finally {
    delete validatingAccountIds.value[row.id]
  }
}

// 页面加载时获取账号数据
onMounted(() => {
  loadAccounts()
})

onBeforeUnmount(() => {
  closeValidateAccountsSse()
  closeSSEConnection()
})

// 获取平台标签类型
const getPlatformTagType = (platform) => {
  const typeMap = {
    '快手': 'success',
    '抖音': 'danger',
    '视频号': 'warning',
    '小红书': 'info'
  }
  return typeMap[platform] || 'info'
}

// 判断状态是否可点击（异常状态可点击）
const isStatusClickable = (status) => {
  return status === '异常'; // 只有异常状态可点击，验证中不可点击
}

// 获取状态标签类型
const getStatusTagType = (status) => {
  if (status === '验证中') {
    return 'info'; // 验证中使用灰色
  } else if (status === '正常') {
    return 'success'; // 正常使用绿色
  } else {
    return 'danger'; // 无效使用红色
  }
}

// 处理状态点击事件
const handleStatusClick = (row) => {
  if (isStatusClickable(row.status)) {
    // 触发重新登录流程
    handleReLogin(row)
  }
}

// 过滤后的账号列表
const filteredAccounts = computed(() => {
  if (!searchKeyword.value) return accountStore.accounts
  return accountStore.accounts.filter(account =>
    account.name.includes(searchKeyword.value)
  )
})

// 按平台过滤的账号列表
const filteredKuaishouAccounts = computed(() => {
  return filteredAccounts.value.filter(account => account.platform === '快手')
})

const filteredDouyinAccounts = computed(() => {
  return filteredAccounts.value.filter(account => account.platform === '抖音')
})

const filteredChannelsAccounts = computed(() => {
  return filteredAccounts.value.filter(account => account.platform === '视频号')
})

const filteredXiaohongshuAccounts = computed(() => {
  return filteredAccounts.value.filter(account => account.platform === '小红书')
})

// 搜索处理
const handleSearch = () => {
  // 搜索逻辑已通过计算属性实现
}

// 对话框相关
const dialogVisible = ref(false)
const dialogType = ref('add') // 'add' 或 'edit'
const accountFormRef = ref(null)

// 账号表单
const accountForm = reactive({
  id: null,
  name: '',
  platform: '',
  status: '正常',
  browserLogin: false
})

// 表单验证规则
const rules = {
  platform: [{ required: true, message: '请选择平台', trigger: 'change' }],
  name: [{ required: true, message: '请输入账号名称', trigger: 'blur' }]
}

// SSE连接状态
const sseConnecting = ref(false)
const qrCodeData = ref('')
const loginStatus = ref('')

// 无浏览器模式：启动 SSE 至二维码出现前的全屏 loading
const headlessLoginPreparing = computed(() =>
  dialogType.value === 'add' &&
  !accountForm.browserLogin &&
  sseConnecting.value &&
  !qrCodeData.value &&
  !loginStatus.value
)

// 添加账号
const handleAddAccount = () => {
  dialogType.value = 'add'
  Object.assign(accountForm, {
    id: null,
    name: '',
    platform: '',
    status: '正常',
    browserLogin: false
  })
  // 重置SSE状态
  sseConnecting.value = false
  qrCodeData.value = ''
  loginStatus.value = ''
  dialogVisible.value = true
}

const openAddAccountFromQuery = () => {
  if (route.query.openAdd !== '1') {
    return
  }
  const platformQuery = route.query.platform
  handleAddAccount()
  if (typeof platformQuery === 'string' && platformQuery) {
    accountForm.platform = platformQuery
  }
  router.replace({ path: route.path, query: {} })
}

watch(
  () => route.query.openAdd,
  (openAdd) => {
    if (openAdd === '1') {
      openAddAccountFromQuery()
    }
  }
)

onMounted(() => {
  openAddAccountFromQuery()
})

// 编辑账号
const handleEdit = (row) => {
  dialogType.value = 'edit'
  Object.assign(accountForm, {
    id: row.id,
    name: row.name,
    platform: row.platform,
    status: row.status
  })
  dialogVisible.value = true
}

// 删除账号
const handleDelete = (row) => {
  ElMessageBox.confirm(
    `确定要删除账号 ${row.name} 吗？`,
    '警告',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    }
  )
    .then(async () => {
      try {
        // 调用API删除账号
        const response = await accountApi.deleteAccount(row.id)

        if (response.code === 200) {
          // 从状态管理中删除账号
          accountStore.deleteAccount(row.id)
          ElMessage({
            type: 'success',
            message: '删除成功',
          })
        } else {
          ElMessage.error(response.msg || '删除失败')
        }
      } catch (error) {
        console.error('删除账号失败:', error)
        ElMessage.error('删除账号失败')
      }
    })
    .catch(() => {
      // 取消删除
    })
}

// 下载Cookie文件
const handleDownloadCookie = (row) => {
  // 从后端获取Cookie文件
  const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5409'
  const downloadUrl = `${baseUrl}/downloadCookie?filePath=${encodeURIComponent(row.filePath)}`

  // 创建一个隐藏的链接来触发下载
  const link = document.createElement('a')
  link.href = downloadUrl
  link.download = `${row.name}_cookie.json`
  link.target = '_blank'
  link.style.display = 'none'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

// 上传Cookie文件
const handleUploadCookie = (row) => {
  // 创建一个隐藏的文件输入框
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = '.json'
  input.style.display = 'none'
  document.body.appendChild(input)

  input.onchange = async (event) => {
    const file = event.target.files[0]
    if (!file) return

    // 检查文件类型
    if (!file.name.endsWith('.json')) {
      ElMessage.error('请选择JSON格式的Cookie文件')
      document.body.removeChild(input)
      return
    }

    try {
      // 创建FormData对象
      const formData = new FormData()
      formData.append('file', file)
      formData.append('id', row.id)
      formData.append('platform', row.platform)

      // 使用统一的http封装发送上传请求
      const result = await http.upload('/uploadCookie', formData)

      ElMessage.success('Cookie文件上传成功')
      // 刷新账号列表以显示更新
      loadAccounts()
    } catch (error) {
      ElMessage.error('Cookie文件上传失败')
    } finally {
      document.body.removeChild(input)
    }
  }

  input.click()
}

// 重新登录账号
const handleReLogin = (row) => {
  // 设置表单信息
  dialogType.value = 'edit'
  Object.assign(accountForm, {
    id: row.id,
    name: row.name,
    platform: row.platform,
    status: row.status
  })

  // 重置SSE状态
  sseConnecting.value = false
  qrCodeData.value = ''
  loginStatus.value = ''

  // 显示对话框
  dialogVisible.value = true

  // 立即开始登录流程
  setTimeout(() => {
    connectSSE(row.platform, row.name)
  }, 300)
}

// 获取默认头像
const getDefaultAvatar = (name) => {
  // 使用简单的默认头像，可以基于用户名生成不同的颜色
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`
}

// SSE 连接句柄（fetch 流，可携带 Bearer token）
let sseConnection = null

// 关闭SSE连接
const closeSSEConnection = () => {
  if (sseConnection) {
    sseConnection.close()
    sseConnection = null
  }
}

// 建立SSE连接
const connectSSE = (platform, name, browserLogin = false) => {
  // 关闭可能存在的连接
  closeSSEConnection()

  // 设置连接状态
  sseConnecting.value = true
  qrCodeData.value = ''
  loginStatus.value = ''

  // 获取平台类型编号
  const platformTypeMap = {
    '小红书': '1',
    '视频号': '2',
    '抖音': '3',
    '快手': '4'
  }

  const type = platformTypeMap[platform] || '1'

  // 创建SSE连接
  const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5409'
  let url = `${baseUrl}/login?type=${type}&id=${encodeURIComponent(name)}`
  if (browserLogin) {
    url += '&browserLogin=true'
  }

  sseConnection = openAuthenticatedSse(url, {
    onMessage: (event) => {
      const data = event.data

      // 如果还没有二维码数据，且数据长度较长，认为是二维码
      if (!qrCodeData.value && data.length > 100) {
        try {
          if (data.startsWith('data:image')) {
            qrCodeData.value = data
          } else {
            qrCodeData.value = `data:image/png;base64,${data}`
          }
        } catch (error) {
          // 处理二维码数据出错
        }
      }
      // 如果收到状态码
      else if (data === '200' || data === '500') {
        loginStatus.value = data

        // 如果登录成功
        if (data === '200') {
          setTimeout(() => {
            // 关闭连接
            closeSSEConnection()

            // 1秒后关闭对话框并开始刷新
            setTimeout(() => {
              dialogVisible.value = false
              sseConnecting.value = false

              // 根据是否是重新登录显示不同提示
              ElMessage.success(dialogType.value === 'edit' ? '重新登录成功' : '账号添加成功')

              // 显示更新账号信息提示
              ElMessage({
                type: 'info',
                message: '正在同步账号信息...',
                duration: 0
              })

              // 触发刷新操作
              loadAccounts().then(() => {
                // 刷新完成后关闭提示
                ElMessage.closeAll()
                ElMessage.success('账号信息已更新')
              })
            }, 1000)
          }, 1000)
        } else {
          // 登录失败，关闭连接
          closeSSEConnection()

          // 2秒后重置状态，允许重试
          setTimeout(() => {
            sseConnecting.value = false
            qrCodeData.value = ''
            loginStatus.value = ''
          }, 2000)
        }
      }
    },
    onError: (error) => {
      console.error('SSE连接错误:', error)
      ElMessage.error(error.message || '连接服务器失败，请稍后再试')
      closeSSEConnection()
      sseConnecting.value = false
    },
  })
}

// 提交账号表单
const submitAccountForm = () => {
  accountFormRef.value.validate(async (valid) => {
    if (valid) {
      if (dialogType.value === 'add') {
        // 建立SSE连接
        connectSSE(accountForm.platform, accountForm.name, accountForm.browserLogin)
      } else {
        // 编辑账号逻辑
        try {
          // 将平台名称转换为类型数字
          const platformTypeMap = {
            '小红书': 1,
            '视频号': 2,
            '抖音': 3,
            '快手': 4
          };
          const type = platformTypeMap[accountForm.platform] || 1;

          const res = await accountApi.updateAccount({
            id: accountForm.id,
            type: type,
            userName: accountForm.name
          })
          if (res.code === 200) {
            // 更新状态管理中的账号
            const updatedAccount = {
              id: accountForm.id,
              name: accountForm.name,
              platform: accountForm.platform,
              status: accountForm.status // Keep the existing status
            };
            accountStore.updateAccount(accountForm.id, updatedAccount)
            ElMessage.success('更新成功')
            dialogVisible.value = false
            // 刷新账号列表
            loadAccounts()
          } else {
            ElMessage.error(res.msg || '更新账号失败')
          }
        } catch (error) {
          console.error('更新账号失败:', error)
          ElMessage.error('更新账号失败')
        }
      }
    } else {
      return false
    }
  })
}

// 组件卸载前关闭SSE连接
onBeforeUnmount(() => {
  closeSSEConnection()
})
</script>

<style lang="scss" scoped>
@use '@/styles/variables.scss' as *;

@keyframes rotate {
  from {
    transform: rotate(0deg);
  }

  to {
    transform: rotate(360deg);
  }
}

.account-management {
  .page-header {
    margin-bottom: 20px;

    h1 {
      font-size: 24px;
      color: $text-primary;
      margin: 0;
    }
  }

  .account-tabs {
    background-color: #fff;
    border-radius: 4px;
    box-shadow: $box-shadow-light;

    .account-tabs-nav {
      padding: 20px;
    }
  }

  .account-list-container {
    .account-search {
      display: flex;
      justify-content: space-between;
      margin-bottom: 20px;

      .el-input {
        width: 300px;
      }

      .action-buttons {
        display: flex;
        gap: 10px;

        .el-icon.is-loading {
          animation: rotate 1s linear infinite;
        }
      }
    }

    .account-list {
      margin-bottom: 20px;
    }

    .empty-data {
      padding: 40px 0;
    }
  }

  // 二维码容器样式
  .clickable-status {
    cursor: pointer;
    transition: all 0.3s;

    &:hover {
      transform: scale(1.05);
      box-shadow: 0 0 8px rgba(0, 0, 0, 0.15);
    }
  }

  .account-dialog-body {
    min-height: 120px;
  }

  .browser-login-tip {
    margin: 8px 0 0;
    font-size: 12px;
    line-height: 1.6;
    color: $text-secondary;
  }

  .qrcode-container {
    margin-top: 20px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 250px;

    .qrcode-wrapper {
      text-align: center;

      .qrcode-tip {
        margin-bottom: 15px;
        color: #606266;
      }

      .qrcode-image {
        max-width: 200px;
        max-height: 200px;
        border: 1px solid #ebeef5;
        background-color: black;
      }
    }

    .loading-wrapper,
    .success-wrapper,
    .error-wrapper {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 10px;

      .el-icon {
        font-size: 48px;

        &.is-loading {
          animation: rotate 1s linear infinite;
        }
      }

      span {
        font-size: 16px;
      }
    }

    .success-wrapper .el-icon {
      color: #67c23a;
    }

    .error-wrapper .el-icon {
      color: #f56c6c;
    }
  }
}

@media (max-width: 767px) {
  .account-management {
    .page-header h1 {
      font-size: 20px;
    }

    .account-tabs .account-tabs-nav {
      padding: 12px;
    }

    .account-list-container {
      .account-search {
        flex-direction: column;
        align-items: stretch;
        gap: 12px;

        .el-input {
          width: 100%;
        }

        .action-buttons {
          flex-wrap: wrap;

          .el-button {
            flex: 1;
            min-width: 120px;
          }
        }
      }

      .account-list {
        overflow-x: auto;
        -webkit-overflow-scrolling: touch;

        :deep(.el-table) {
          min-width: 880px;
        }

        :deep(.el-table__cell) {
          .cell {
            .el-button+.el-button {
              margin-left: 4px;
            }
          }
        }
      }
    }

    :deep(.el-tabs__header) {
      margin-bottom: 12px;
    }

    :deep(.el-tabs__nav-wrap) {
      overflow-x: auto;
    }

    :deep(.el-tabs__item) {
      padding: 0 14px;
    }
  }
}
</style>