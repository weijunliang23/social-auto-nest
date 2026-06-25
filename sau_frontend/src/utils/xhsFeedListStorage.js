/**
 * 源：redbook/web/src/utils/xhsFeedListStorage.ts
 * 与 redbook 使用相同 localStorage key，便于迁移期数据兼容。
 */

const KEY_HOME = 'starfire.xhs.homeFeeds'
const KEY_SEARCH = 'starfire.xhs.searchFeeds'

function safeParse(raw) {
  if (!raw) return null
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export function loadHomeFeedsCache() {
  const p = safeParse(localStorage.getItem(KEY_HOME))
  if (!p || p.v !== 1 || !Array.isArray(p.feeds)) return null
  return { feeds: p.feeds, count: p.count, savedAt: p.savedAt }
}

export function saveHomeFeedsCache(feeds, count) {
  const payload = {
    v: 1,
    feeds,
    count,
    savedAt: Date.now(),
  }
  try {
    localStorage.setItem(KEY_HOME, JSON.stringify(payload))
  } catch {
    /* quota or private mode */
  }
}

export function loadSearchFeedsCache() {
  const p = safeParse(localStorage.getItem(KEY_SEARCH))
  if (!p || p.v !== 1 || !Array.isArray(p.feeds) || typeof p.keyword !== 'string') return null
  return {
    keyword: p.keyword,
    feeds: p.feeds,
    count: p.count,
    savedAt: p.savedAt,
  }
}

export function saveSearchFeedsCache(keyword, feeds, count) {
  const payload = {
    v: 1,
    keyword,
    feeds,
    count,
    savedAt: Date.now(),
  }
  try {
    localStorage.setItem(KEY_SEARCH, JSON.stringify(payload))
  } catch {
    /* ignore */
  }
}
