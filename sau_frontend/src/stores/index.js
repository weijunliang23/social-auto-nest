import { createPinia } from 'pinia'
import { useUserStore } from './user'
import { useAccountStore } from './account'
import { useAppStore } from './app'
import { useMcpConsoleStore } from './mcpConsole'

const pinia = createPinia()

export default pinia
export { useUserStore, useAccountStore, useAppStore, useMcpConsoleStore }