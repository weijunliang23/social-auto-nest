/**
 * 控制台展示用：压缩超长 base64，避免拖垮 DOM。
 * 源：redbook/web/src/utils/safeJsonForConsole.ts
 */
export function safeJsonForConsole(value, maxInline = 120) {
  try {
    return JSON.stringify(
      value,
      (_key, v) => {
        if (typeof v === 'string' && v.length > maxInline) {
          const looksBase64 = /^[A-Za-z0-9+/=\s]+$/.test(v.slice(0, 200)) && v.length > 200
          if (looksBase64 || v.startsWith('data:image')) {
            return `[omitted string length=${v.length}]`
          }
        }
        return v
      },
      2,
    )
  } catch {
    return String(value)
  }
}
