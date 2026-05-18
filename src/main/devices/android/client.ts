import { Adb } from '@devicefarmer/adbkit'
import type { Client } from '@devicefarmer/adbkit'
import { resolveAdbExecutable } from '../toolkit-paths'

let client: Client | null = null

export function getAdbClient(): Client {
  if (!client) {
    client = Adb.createClient({ bin: resolveAdbExecutable() })
  }
  return client
}
