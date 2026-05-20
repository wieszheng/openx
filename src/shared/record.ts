export type RecordStartResult = { ok: true } | { ok: false; error: string }

export type RecordStopResult =
  | { ok: true; filePath: string; durationSec: number }
  | { ok: false; error: string }
