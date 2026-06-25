import { handleMcpBridge } from './mcp-bridge-core.mjs'

/** 在 Vite dev / preview 进程内处理 /api/mcp/call，无需单独跑 server.mjs */
export default function vitePluginMcpBridge() {
  let logged = false
  function mount(server) {
    server.middlewares.use(async (req, res, next) => {
      try {
        if (await handleMcpBridge(req, res)) {
          if (!logged) {
            logged = true
            console.log(
              '[mcp-bridge] /api/mcp/call → Go MCP（见 mcp-bridge-core.mjs，先于 Flask 代理）',
            )
          }
          return
        }
      } catch (e) {
        console.error('[mcp-bridge]', e)
        next(e)
        return
      }
      next()
    })
  }
  return {
    name: 'vite-plugin-mcp-bridge',
    configureServer: mount,
    configurePreviewServer: mount,
  }
}
