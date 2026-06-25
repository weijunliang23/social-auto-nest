import { ElMessage } from 'element-plus'
import router from '@/router'
import { clearAuth, getToken } from './auth'

/**
 * 通过 fetch 建立带 Authorization 的 SSE 连接。
 * 原生 EventSource 无法自定义请求头，无法携带 localStorage 中的 Bearer token。
 */
export function openAuthenticatedSse(url, { onMessage, onError } = {}) {
  const controller = new AbortController()
  let closed = false

  const close = () => {
    if (!closed) {
      closed = true
      controller.abort()
    }
  }

  const token = getToken()

  fetch(url, {
    method: 'GET',
    headers: {
      Accept: 'text/event-stream',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    signal: controller.signal,
  })
    .then(async (response) => {
      const contentType = response.headers.get('content-type') || ''

      if (!response.ok) {
        let message = '连接服务器失败'
        try {
          const body = await response.json()
          message = body.msg || message
        } catch {
          // ignore
        }

        if (response.status === 401) {
          clearAuth()
          ElMessage.error(message || '未授权，请重新登录')
          if (router.currentRoute.value.path !== '/login') {
            router.push('/login')
          }
        }

        throw new Error(message)
      }

      if (!contentType.includes('text/event-stream')) {
        throw new Error('服务器未返回 SSE 流')
      }

      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error('无法读取响应流')
      }

      const decoder = new TextDecoder()
      let buffer = ''

      while (!closed) {
        const { done, value } = await reader.read()
        if (done) {
          break
        }

        buffer += decoder.decode(value, { stream: true })
        buffer = buffer.replace(/\r\n/g, '\n')

        let boundary = buffer.indexOf('\n\n')
        while (boundary !== -1) {
          const chunk = buffer.slice(0, boundary)
          buffer = buffer.slice(boundary + 2)

          for (const line of chunk.split('\n')) {
            if (line.startsWith('data: ')) {
              onMessage?.({ data: line.slice(6) })
            }
          }

          boundary = buffer.indexOf('\n\n')
        }
      }

      if (buffer.trim()) {
        for (const line of buffer.split('\n')) {
          if (line.startsWith('data: ')) {
            onMessage?.({ data: line.slice(6) })
          }
        }
      }
    })
    .catch((error) => {
      if (error.name === 'AbortError' || closed) {
        return
      }
      onError?.(error)
    })

  return { close }
}
