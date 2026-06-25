/**
 * MCP tools/call 常见返回：content 数组，含 text / image(base64) 等块。
 * 源：redbook/web/src/utils/mcpContent.ts
 */

function unwrapToolResult(result) {
  if (!result || typeof result !== 'object') return result
  const r = result
  if (Array.isArray(r.content)) return r
  if (typeof r.structuredContent === 'object' && r.structuredContent !== null) {
    return unwrapToolResult(r.structuredContent)
  }
  if (typeof r.content === 'object' && r.content !== null) {
    return unwrapToolResult(r.content)
  }
  return result
}

export function extractMcpContentParts(result) {
  const texts = []
  const images = []

  const root = unwrapToolResult(result)
  const content =
    root && typeof root === 'object' && 'content' in root ? root.content : null

  if (!Array.isArray(content)) {
    return { texts, images }
  }

  for (const item of content) {
    if (!item || typeof item !== 'object') continue
    const block = item
    const type = typeof block.type === 'string' ? block.type : ''

    if (type === 'text' && typeof block.text === 'string' && block.text.trim()) {
      texts.push(block.text.trim())
    }

    if (type === 'image') {
      const mimeType =
        typeof block.mimeType === 'string' && block.mimeType ? block.mimeType : 'image/png'
      let raw = ''
      if (typeof block.data === 'string') {
        raw = block.data
      } else if (
        typeof block.source === 'object' &&
        block.source !== null &&
        typeof block.source.data === 'string'
      ) {
        raw = block.source.data
      }
      if (!raw) continue
      const normalized = raw.replace(/\s/g, '')
      const dataUrl = normalized.startsWith('data:')
        ? normalized
        : `data:${mimeType};base64,${normalized}`
      images.push({ mimeType, dataUrl })
    }
  }

  return { texts, images }
}
