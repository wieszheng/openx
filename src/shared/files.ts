export interface FileEntry {
  name: string
  path: string
  isDirectory: boolean
  size: number        // bytes; -1 for directories
  mtime: string       // display string e.g. "2024-01-15 12:30"
  permissions: string // e.g. "drwxrwxrwx"
}

export type FileListResult =
  | { ok: true; entries: FileEntry[] }
  | { ok: false; error: string }

export type FileDownloadResult =
  | { ok: true; localPath: string }
  | { ok: false; error: string }

export type FileUploadResult =
  | { ok: true }
  | { ok: false; error: string }

export type FileDeleteResult =
  | { ok: true }
  | { ok: false; error: string }

export type FileMkdirResult =
  | { ok: true }
  | { ok: false; error: string }
