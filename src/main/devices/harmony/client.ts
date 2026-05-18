import { Hdc } from 'hdckit'
import type { Client } from 'hdckit'
import { resolveHdcExecutable } from '../toolkit-paths'

let client: Client | null = null

export function getHdcClient(): Client {
  if (!client) {
    client = Hdc.createClient({ bin: resolveHdcExecutable() })
  }
  return client
}
