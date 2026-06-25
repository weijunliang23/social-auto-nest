/**
 * MCP 中转：浏览器 JSON → Go MCP JSON-RPC（会话、initialize 等）。
 * 供 Vite 中间件与独立 server.mjs 共用。
 * 源：redbook/web/mcp-bridge-core.mjs（保持行为一致）
 */

const MCP_URL = process.env.MCP_URL || 'http://127.0.0.1:18060/mcp'
const MCP_PROTOCOL_VERSION = '2024-11-05'
const DEFAULT_SERVER = 'xiaohongshu-mcp'
const MCP_SERVER_MAP = {
  'xiaohongshu-mcp': process.env.XHS_MCP_URL || MCP_URL,
  'douyin-mcp': process.env.DOUYIN_MCP_URL || 'http://127.0.0.1:18061/mcp',
  'xianyu-mcp': process.env.XIANYU_MCP_URL || 'http://127.0.0.1:18062/mcp',
}
const serverStates = new Map()

function json(res, statusCode, body) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  })
  res.end(JSON.stringify(body))
}

function pathnameOnly(reqUrl) {
  try {
    return new URL(reqUrl || '/', 'http://127.0.0.1').pathname
  } catch {
    return reqUrl?.split('?')[0] || ''
  }
}

function normalizeToolName(rawName) {
  const marker = '-mcp-'
  const index = rawName.lastIndexOf(marker)
  if (index >= 0) {
    return rawName.slice(index + marker.length)
  }
  return rawName
}

function extractSseJson(rawText) {
  const lines = rawText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)

  const dataLines = lines
    .filter((line) => line.startsWith('data:'))
    .map((line) => line.slice(5).trim())
    .filter((value) => value && value !== '[DONE]')

  for (let i = dataLines.length - 1; i >= 0; i -= 1) {
    const item = dataLines[i]
    try {
      return JSON.parse(item)
    } catch {
      // keep trying previous item
    }
  }

  return null
}

function getState(serverName) {
  if (!serverStates.has(serverName)) {
    serverStates.set(serverName, {
      sessionId: null,
      initPromise: null,
    })
  }
  return serverStates.get(serverName)
}

function getMcpUrl(serverName) {
  return MCP_SERVER_MAP[serverName] || MCP_URL
}

function isSessionNotFoundResponse(status, text) {
  return (
    status === 404 &&
    typeof text === 'string' &&
    /session not found/i.test(text)
  )
}

async function rpcCall(serverName, payload, options = {}) {
  const { _retryAfterReinit = false } = options
  const state = getState(serverName)
  const mcpUrl = getMcpUrl(serverName)
  const headers = {
    'Content-Type': 'application/json',
    Accept: 'application/json, text/event-stream',
  }
  if (state.sessionId && payload.method !== 'initialize') {
    headers['mcp-session-id'] = state.sessionId
  }

  const response = await fetch(mcpUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  })

  const newSessionId = response.headers.get('mcp-session-id')
  if (newSessionId) {
    state.sessionId = newSessionId
  }

  const text = await response.text()
  if (!response.ok) {
    if (
      isSessionNotFoundResponse(response.status, text) &&
      !_retryAfterReinit &&
      payload.method !== 'initialize'
    ) {
      state.sessionId = null
      state.initPromise = null
      await ensureInitialized(serverName)
      return rpcCall(serverName, payload, { _retryAfterReinit: true })
    }
    const err = new Error(`MCP HTTP ${response.status}: ${text}`)
    err.sourceRes = {
      status: response.status,
      contentType: response.headers.get('content-type') || '',
      text,
    }
    throw err
  }

  if (!text.trim()) {
    return {
      jsonrpc: '2.0',
      result: null,
      _sourceRes: {
        status: response.status,
        contentType: response.headers.get('content-type') || '',
        text,
      },
    }
  }

  let data = null
  try {
    data = JSON.parse(text)
  } catch {
    data = extractSseJson(text)
  }

  if (!data) {
    const err = new Error(`MCP 返回非 JSON 数据: ${text}`)
    err.sourceRes = {
      status: response.status,
      contentType: response.headers.get('content-type') || '',
      text,
    }
    throw err
  }

  if (data.error) {
    const err = new Error(data.error.message || 'MCP 调用失败')
    err.sourceRes = {
      status: response.status,
      contentType: response.headers.get('content-type') || '',
      text,
      data,
    }
    throw err
  }

  data._sourceRes = {
    status: response.status,
    contentType: response.headers.get('content-type') || '',
    text,
  }
  return data
}

async function ensureInitialized(serverName) {
  const state = getState(serverName)
  if (state.initPromise) {
    return state.initPromise
  }

  state.initPromise = (async () => {
    const initPayload = {
      jsonrpc: '2.0',
      id: `${Date.now()}-init`,
      method: 'initialize',
      params: {
        protocolVersion: MCP_PROTOCOL_VERSION,
        capabilities: {},
        clientInfo: {
          name: 'starfire-mcp-bridge',
          version: '0.1.0',
        },
      },
    }
    await rpcCall(serverName, initPayload)

    await rpcCall(serverName, {
      jsonrpc: '2.0',
      method: 'notifications/initialized',
      params: {},
    })
  })()

  try {
    await state.initPromise
  } catch (error) {
    state.initPromise = null
    state.sessionId = null
    throw error
  }
}

async function callMcpTool(serverName, name, input) {
  await ensureInitialized(serverName)
  const payload = {
    jsonrpc: '2.0',
    id: `${Date.now()}`,
    method: 'tools/call',
    params: {
      name,
      arguments: input,
    },
  }

  const data = await rpcCall(serverName, payload)
  return data.result
}

async function readRequestBody(req) {
  const chunks = []
  for await (const chunk of req) {
    chunks.push(chunk)
  }
  return Buffer.concat(chunks).toString('utf8')
}

/**
 * 处理 /api/mcp/call 与对应 OPTIONS；已处理则返回 true（且已 end）。
 */
export async function handleMcpBridge(req, res) {
  const path = pathnameOnly(req.url)

  if (req.method === 'OPTIONS' && path === '/api/mcp/call') {
    json(res, 200, { ok: true })
    return true
  }

  if (req.method !== 'POST' || path !== '/api/mcp/call') {
    return false
  }

  try {
    const body = await readRequestBody(req)
    const parsed = JSON.parse(body || '{}')
    const { server, tool, input } = parsed
    if (!tool || typeof tool !== 'string') {
      json(res, 400, { error: 'tool 参数缺失' })
      return true
    }

    const serverName =
      typeof server === 'string' && server.trim() ? server.trim() : DEFAULT_SERVER
    const result = await callMcpTool(serverName, normalizeToolName(tool), input || {})
    json(res, 200, {
      ok: true,
      result,
    })
    return true
  } catch (error) {
    const message = error instanceof Error ? error.message : '未知错误'
    const sourceRes =
      typeof error === 'object' &&
      error !== null &&
      'sourceRes' in error &&
      typeof error.sourceRes === 'object'
        ? error.sourceRes
        : null
    json(res, 500, { ok: false, error: message, sourceRes })
    return true
  }
}
