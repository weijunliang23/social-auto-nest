import { storeToRefs } from 'pinia'
import { useMcpConsoleStore } from '@/stores/mcpConsole'

/**
 * 与 redbook useMcpConsole 对齐：loading / message / result / runTool / setMessage
 */
export function useMcpConsole() {
  const store = useMcpConsoleStore()
  const refs = storeToRefs(store)
  return {
    server: refs.server,
    loading: refs.loading,
    message: refs.message,
    result: refs.result,
    setMessage: store.setMessage,
    runTool: store.runTool,
  }
}
