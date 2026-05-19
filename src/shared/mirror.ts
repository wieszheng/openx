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
  maxSize?: number
  bitRate?: number
}

export interface FramePacket {
  type: 'configuration' | 'data'
  data: Buffer
  keyframe?: boolean
}
