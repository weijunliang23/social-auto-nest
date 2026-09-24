import { isCookieLoginFailure } from '@/utils/publishCookieRecovery'

/** 视频号平台 type */
export const PLATFORM_TYPE_TENCENT = 2

/**
 * 解析记录实际使用的 browserPublish（与后端 buildJobPayloadFromRecord 一致）
 */
export function resolveRecordBrowserPublish(record) {
  const extra = record?.extra_config
  if (extra && typeof extra === 'object' && extra.browserPublish !== undefined) {
    return Boolean(extra.browserPublish)
  }
  if (record?.platform_type === PLATFORM_TYPE_TENCENT) {
    return true
  }
  return false
}

export function getPublishBrowserLabel(record) {
  return resolveRecordBrowserPublish(record) ? '有头浏览器' : '无头浏览器'
}

/** 失败且非 Cookie/登录类错误、当前为无头时可提供有头重试 */
export function shouldOfferHeadedRetry(record) {
  if (!record || record.status !== 'failed') {
    return false
  }
  if (isCookieLoginFailure(record.status_message || '')) {
    return false
  }
  return !resolveRecordBrowserPublish(record)
}
