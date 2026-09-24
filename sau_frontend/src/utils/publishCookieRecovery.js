/** 平台 type → 账号管理表单中的平台名称 */
export const PLATFORM_TYPE_LABEL = {
  1: '小红书',
  2: '视频号',
  3: '抖音',
  4: '快手'
}

/** 是否为 Cookie 缺失/失效类错误（四平台统一文案） */
export function isCookieLoginFailure(message) {
  if (!message || typeof message !== 'string') {
    return false
  }
  return (
    message.includes('cookie文件不存在') ||
    message.includes('cookie文件已失效') ||
    /请先完成.+登录/.test(message) ||
    message.includes('视频号未登录')
  )
}

/** 从 status_message 中解析 cookie 文件名（xxx.json） */
export function extractCookieBasename(message) {
  if (!message || typeof message !== 'string') {
    return null
  }
  const tailMatch = message.match(/([^\s\\/]+\.json)\s*$/)
  if (tailMatch) {
    return tailMatch[1]
  }
  const uuidMatch = message.match(
    /([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.json)/i
  )
  return uuidMatch ? uuidMatch[1] : null
}

/**
 * 根据失败信息解析要删除的账号 id
 * @param {string} message
 * @param {{ accounts: Array<{ id: string, filePath: string }> }} accountStore
 * @param {string[]} fallbackAccountIds 发布时选中的账号 id
 */
export function resolveAccountIdFromFailure(
  message,
  accountStore,
  fallbackAccountIds = []
) {
  const basename = extractCookieBasename(message)
  if (basename && accountStore?.accounts?.length) {
    const matched = accountStore.accounts.find(
      (acc) =>
        acc.filePath === basename ||
        acc.filePath.endsWith(`/${basename}`) ||
        acc.filePath.endsWith(`\\${basename}`)
    )
    if (matched) {
      return matched.id
    }
  }

  if (fallbackAccountIds.length === 1) {
    return fallbackAccountIds[0]
  }

  return null
}

export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
