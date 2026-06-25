/**
 * 源：redbook/web/src/utils/parseXhsFeedDetail.ts
 */
import { extractMcpContentParts } from './mcpContent'

function normalizeImageUrl(url) {
  if (url.startsWith('http://')) {
    return `https://${url.slice(7)}`
  }
  return url
}

function pickImageUrl(img) {
  const urlPre = typeof img.urlPre === 'string' ? img.urlPre : ''
  const urlDefault = typeof img.urlDefault === 'string' ? img.urlDefault : ''
  const raw = urlPre || urlDefault
  return raw ? normalizeImageUrl(raw) : ''
}

function parseSubComment(raw) {
  if (!raw || typeof raw !== 'object') return null
  const o = raw
  const id = typeof o.id === 'string' ? o.id : ''
  const content = typeof o.content === 'string' ? o.content : ''
  if (!id) return null
  const user = o.userInfo && typeof o.userInfo === 'object' ? o.userInfo : {}
  const nickname =
    typeof user.nickname === 'string'
      ? user.nickname
      : typeof user.nickName === 'string'
        ? user.nickName
        : '匿名'
  const showTags = Array.isArray(o.showTags) ? o.showTags : []
  const isAuthor = showTags.includes('is_author')
  const likeCount = typeof o.likeCount === 'string' ? o.likeCount : '0'
  const createTime = typeof o.createTime === 'number' ? o.createTime : 0
  return { id, content, likeCount, createTime, nickname, isAuthor }
}

function parseComment(raw) {
  if (!raw || typeof raw !== 'object') return null
  const o = raw
  const id = typeof o.id === 'string' ? o.id : ''
  const content = typeof o.content === 'string' ? o.content : ''
  if (!id) return null
  const user = o.userInfo && typeof o.userInfo === 'object' ? o.userInfo : {}
  const nickname =
    typeof user.nickname === 'string'
      ? user.nickname
      : typeof user.nickName === 'string'
        ? user.nickName
        : '匿名'
  const showTags = Array.isArray(o.showTags) ? o.showTags : []
  const isAuthor = showTags.includes('is_author')
  const likeCount = typeof o.likeCount === 'string' ? o.likeCount : '0'
  const createTime = typeof o.createTime === 'number' ? o.createTime : 0
  const ipLocation = typeof o.ipLocation === 'string' ? o.ipLocation : ''
  const subsRaw = Array.isArray(o.subComments) ? o.subComments : []
  const subComments = subsRaw.map((s) => parseSubComment(s)).filter((x) => x !== null)
  return {
    id,
    content,
    likeCount,
    createTime,
    ipLocation,
    nickname,
    isAuthor,
    subComments,
  }
}

/** 从 get_feed_detail 的 MCP 返回（content 里 text 为 JSON 字符串）解析笔记与评论 */
export function parseFeedDetailFromMcpResult(result) {
  const { texts } = extractMcpContentParts(result)
  for (const t of texts) {
    try {
      const root = JSON.parse(t)
      const feedId = typeof root.feed_id === 'string' ? root.feed_id : ''
      const data = root.data && typeof root.data === 'object' ? root.data : undefined
      if (!data) continue
      const note = data.note && typeof data.note === 'object' ? data.note : undefined
      if (!note) continue

      const title = typeof note.title === 'string' ? note.title : '（无标题）'
      const desc = typeof note.desc === 'string' ? note.desc : ''
      const noteType = typeof note.type === 'string' ? note.type : 'normal'
      const time = typeof note.time === 'number' ? note.time : 0
      const ipLocation = typeof note.ipLocation === 'string' ? note.ipLocation : ''

      const userRaw = note.user && typeof note.user === 'object' ? note.user : {}
      const user = {
        userId: typeof userRaw.userId === 'string' ? userRaw.userId : '',
        nickname:
          typeof userRaw.nickname === 'string'
            ? userRaw.nickname
            : typeof userRaw.nickName === 'string'
              ? userRaw.nickName
              : '未知用户',
        avatar: typeof userRaw.avatar === 'string' ? normalizeImageUrl(userRaw.avatar) : '',
      }

      const interactRaw =
        note.interactInfo && typeof note.interactInfo === 'object' ? note.interactInfo : {}
      const interact = {
        liked: interactRaw.liked === true,
        likedCount:
          typeof interactRaw.likedCount === 'string' ? interactRaw.likedCount : '—',
        commentCount:
          typeof interactRaw.commentCount === 'string' ? interactRaw.commentCount : '—',
        collectedCount:
          typeof interactRaw.collectedCount === 'string' ? interactRaw.collectedCount : '—',
        collected: interactRaw.collected === true,
        sharedCount:
          typeof interactRaw.sharedCount === 'string' ? interactRaw.sharedCount : '—',
      }

      const imageList = Array.isArray(note.imageList) ? note.imageList : []
      const images = []
      for (const item of imageList) {
        if (!item || typeof item !== 'object') continue
        const url = pickImageUrl(item)
        if (!url) continue
        images.push({
          url,
          width: typeof item.width === 'number' ? item.width : 0,
          height: typeof item.height === 'number' ? item.height : 0,
        })
      }

      const commentsBlock =
        data.comments && typeof data.comments === 'object' ? data.comments : undefined
      const listRaw =
        commentsBlock && Array.isArray(commentsBlock.list) ? commentsBlock.list : []
      const comments = listRaw.map((c) => parseComment(c)).filter((x) => x !== null)
      const hasMoreComments = commentsBlock?.hasMore === true

      return {
        feedId: feedId || (typeof note.noteId === 'string' ? note.noteId : ''),
        title: title || '（无标题）',
        desc,
        noteType,
        time,
        ipLocation,
        user,
        interact,
        images,
        comments,
        hasMoreComments,
      }
    } catch {
      continue
    }
  }
  return null
}

export function formatXhsDetailTime(ms) {
  if (!ms) return '—'
  try {
    return new Date(ms).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return '—'
  }
}
