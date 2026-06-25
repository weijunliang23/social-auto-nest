/**
 * 源：redbook/web/src/utils/parseXhsListFeeds.ts
 */
import { extractMcpContentParts } from './mcpContent'

function pickCoverUrl(cover) {
  if (!cover) return ''
  const urlPre = typeof cover.urlPre === 'string' ? cover.urlPre : ''
  const urlDefault = typeof cover.urlDefault === 'string' ? cover.urlDefault : ''
  const direct = typeof cover.url === 'string' ? cover.url : ''
  let url = urlPre || urlDefault || direct
  if (!url && Array.isArray(cover.infoList)) {
    const first = cover.infoList[0]
    url = typeof first?.url === 'string' ? first.url : ''
  }
  if (url.startsWith('http://')) {
    url = `https://${url.slice(7)}`
  }
  return url
}

function normalizeFeed(raw) {
  if (!raw || typeof raw !== 'object') return null
  const o = raw
  const modelType = typeof o.modelType === 'string' ? o.modelType : ''
  if (modelType && modelType !== 'note') return null

  const id = typeof o.id === 'string' ? o.id : ''
  const xsecToken = typeof o.xsecToken === 'string' ? o.xsecToken : ''
  if (!id || !xsecToken) return null

  const noteCard = o.noteCard && typeof o.noteCard === 'object' ? o.noteCard : {}
  const title =
    typeof noteCard.displayTitle === 'string' ? noteCard.displayTitle.trim() : '（无标题）'
  const noteType = typeof noteCard.type === 'string' ? noteCard.type : 'normal'

  const user = noteCard.user && typeof noteCard.user === 'object' ? noteCard.user : {}
  const userNickname =
    typeof user.nickname === 'string'
      ? user.nickname
      : typeof user.nickName === 'string'
        ? user.nickName
        : '未知用户'
  const userAvatar = typeof user.avatar === 'string' ? user.avatar : ''
  const userId = typeof user.userId === 'string' ? user.userId : ''

  const interact =
    noteCard.interactInfo && typeof noteCard.interactInfo === 'object'
      ? noteCard.interactInfo
      : {}
  const likedCount =
    typeof interact.likedCount === 'string' && interact.likedCount ? interact.likedCount : '—'

  const cover = noteCard.cover && typeof noteCard.cover === 'object' ? noteCard.cover : undefined
  const coverUrl = pickCoverUrl(cover)

  return {
    id,
    xsecToken,
    title: title || '（无标题）',
    noteType,
    userNickname,
    userAvatar,
    userId,
    likedCount,
    coverUrl,
  }
}

/** 从 list_feeds 的 MCP 返回（content 里 text 为 JSON 字符串）解析笔记列表 */
export function parseFeedsFromMcpResult(result) {
  const { texts } = extractMcpContentParts(result)
  for (const t of texts) {
    try {
      const data = JSON.parse(t)
      if (!Array.isArray(data.feeds)) continue
      const feeds = data.feeds.map((item) => normalizeFeed(item)).filter((x) => x !== null)
      const count = typeof data.count === 'number' ? data.count : feeds.length
      return { feeds, count }
    } catch {
      continue
    }
  }
  return null
}
