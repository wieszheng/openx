export interface MirrorMetadata {
  deviceName: string
  width: number
  height: number
}

export interface MirrorStartResult {
  ok: true
}

export type MirrorActionResult =
  | { ok: true }
  | { ok: false; error: string }

export interface MirrorOptions {
  // Android scrcpy options
  maxSize?: number
  bitRate?: number
  // HarmonyOS UiDriver options
  intervalMs?: number
  scale?: number
}

export type FramePacket =
  | { type: 'configuration'; data: Buffer }
  | { type: 'data'; data: Buffer; keyframe: boolean }
  | { type: 'jpeg'; data: Buffer }
