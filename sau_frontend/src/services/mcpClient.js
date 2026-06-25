/**
 * 小红书 MCP 调用（经 Vite /api/mcp/call → Go），与 redbook web/src/services/mcpClient.ts 契约一致。
 * 独立于 utils/request.js，避免影响现有 Flask 接口拦截逻辑。
 */

/**
 * @param {{ server?: string, tool: string, input?: Record<string, unknown> }} body
 * @returns {Promise<unknown>}
 */
export async function callMcpTool(body) {
  const response = await fetch('/api/mcp/call', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      server: body.server ?? 'xiaohongshu-mcp',
      tool: body.tool,
      input: body.input ?? {},
    }),
  })

  if (!response.ok) {
    throw new Error(`MCP 调用失败：HTTP ${response.status}`)
  }

  const data = await response.json()

  if (!data.ok) {
    throw new Error(data.error || 'MCP 中转调用失败')
  }

  return data.result
}
