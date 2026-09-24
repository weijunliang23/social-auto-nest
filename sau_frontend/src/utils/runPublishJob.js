import { ElMessage } from 'element-plus'
import { accountApi } from '@/api/account'
import { publishRecordApi } from '@/api/publishRecord'
import {
  isCookieLoginFailure,
  PLATFORM_TYPE_LABEL,
  resolveAccountIdFromFailure
} from '@/utils/publishCookieRecovery'

/** 由记录中的 account_list（cookie 文件名）解析账号 id */
export function accountIdsFromFilePaths(accountList, accountStore) {
  if (!Array.isArray(accountList) || !accountStore?.accounts?.length) {
    return []
  }
  return accountList
    .map((filePath) => {
      const acc = accountStore.accounts.find((a) => a.filePath === filePath)
      return acc?.id
    })
    .filter(Boolean)
}

/** Cookie 失效：删账号并跳转账号管理 */
export async function handleCookieLoginRecoveryFromRecord(
  record,
  statusMessage,
  { accountStore, router, fallbackAccountIds = [] }
) {
  const platformLabel =
    PLATFORM_TYPE_LABEL[record.platform_type] || '快手'

  const accountId = resolveAccountIdFromFailure(
    statusMessage,
    accountStore,
    fallbackAccountIds.length
      ? fallbackAccountIds
      : accountIdsFromFilePaths(record.account_list, accountStore)
  )

  if (accountId) {
    try {
      const delRes = await accountApi.deleteAccount(accountId)
      if (delRes.code === 200) {
        accountStore.deleteAccount(accountId)
      }
    } catch (e) {
      console.error('自动删除失效账号失败:', e)
    }
  }

  ElMessage.warning('登录已失效，已移除该账号，请重新添加')
  await router.push({
    path: '/account-management',
    query: { openAdd: '1', platform: platformLabel }
  })
}

/**
 * 轮询发布任务直至结束，并处理成功 / 失败 / Cookie 恢复
 * @returns {{ ok: boolean, record: object }}
 */
export async function waitAndHandlePublishJob(
  recordId,
  {
    accountStore,
    router,
    fallbackAccountIds = [],
    successLabel = '发布成功'
  }
) {
  ElMessage.info('发布任务已提交，正在执行…')

  const record = await publishRecordApi.waitForPublishRecord(recordId)

  if (record.status === 'success') {
    ElMessage.success(successLabel)
    return { ok: true, record }
  }

  const failMsg = record.status_message || '发布失败'

  if (isCookieLoginFailure(failMsg)) {
    await handleCookieLoginRecoveryFromRecord(record, failMsg, {
      accountStore,
      router,
      fallbackAccountIds
    })
    return { ok: false, record, cookieRecovery: true }
  }

  ElMessage.error(failMsg)
  return { ok: false, record }
}
