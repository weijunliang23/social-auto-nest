import { defineStore } from 'pinia'
import { callMcpTool } from '@/services/mcpClient'

/**
 * 小红书 MCP 控制台状态（对应 redbook McpConsoleProvider）。
 * 仅给「小红书管理」子路由使用，不影响其它业务 store。
 */
export const useMcpConsoleStore = defineStore('mcpConsole', {
  state: () => ({
    server: 'xiaohongshu-mcp',
    loading: false,
    message: '欢迎使用小红书 MCP 控制台',
    result: null,
  }),
  actions: {
    setMessage(m) {
      this.message = m
    },
    async runTool(tool, input = {}) {
      this.loading = true
      this.message = `调用中：${tool}`
      try {
        const data = await callMcpTool({ server: this.server, tool, input })
        this.result = data
        this.message = `调用成功：${tool}`
      } catch (error) {
        this.result = null
        this.message = error instanceof Error ? error.message : '调用失败'
      } finally {
        this.loading = false
      }
    },
  },
})
