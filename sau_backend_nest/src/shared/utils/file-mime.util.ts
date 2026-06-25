import { extname } from 'path';

const MIME_BY_EXT: Record<string, string> = {
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mov': 'video/quicktime',
  '.avi': 'video/x-msvideo',
  '.wmv': 'video/x-ms-wmv',
  '.flv': 'video/x-flv',
  '.mkv': 'video/x-matroska',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.bmp': 'image/bmp',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.pdf': 'application/pdf',
  '.txt': 'text/plain; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
};

/** 根据扩展名推断 Content-Type */
export function guessMimeType(filename: string): string {
  const ext = extname(filename).toLowerCase();
  return MIME_BY_EXT[ext] ?? 'application/octet-stream';
}

/** 从 uuid_原始文件名 中提取展示用文件名 */
export function stripStoredFilenamePrefix(storedFilename: string): string {
  const idx = storedFilename.indexOf('_');
  if (idx >= 0 && idx < storedFilename.length - 1) {
    return storedFilename.slice(idx + 1);
  }
  return storedFilename;
}

/** 校验磁盘存储文件名，防止路径穿越 */
export function assertSafeStoredFilename(filename: string): string | null {
  if (!filename || filename.includes('..') || filename.startsWith('/')) {
    return null;
  }
  return filename;
}
