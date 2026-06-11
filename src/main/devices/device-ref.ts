export function parseDeviceRef(
  deviceId: string
): { platform: 'android' | 'harmony' | 'ios'; key: string } | null {
  if (deviceId.startsWith('android:')) {
    const key = deviceId.slice('android:'.length)
    return key ? { platform: 'android', key } : null
  }
  if (deviceId.startsWith('harmony:')) {
    const key = deviceId.slice('harmony:'.length)
    return key ? { platform: 'harmony', key } : null
  }
  if (deviceId.startsWith('ios:')) {
    const key = deviceId.slice('ios:'.length)
    return key ? { platform: 'ios', key } : null
  }
  return null
}

export function truncateUtf8(text: string, maxBytes: number): string {
  const buf = Buffer.from(text, 'utf8')
  if (buf.length <= maxBytes) {
    return text
  }
  return buf.subarray(0, maxBytes).toString('utf8') + '\n...[truncated]'
}

export function logErr(e: unknown): { errMessage: string } {
  return { errMessage: e instanceof Error ? e.message : String(e) }
}

export function assertFiniteNonNegative(n: unknown, _name: string): number | null {
  if (typeof n !== 'number' || !Number.isFinite(n) || n < 0) {
    return null
  }
  return Math.round(n)
}
