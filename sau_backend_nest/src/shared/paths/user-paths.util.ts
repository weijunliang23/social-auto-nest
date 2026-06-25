import { join, basename } from 'path';

/** 用户隔离后的 cookiesFile / videoFile 目录 */
export function userCookiesDir(baseDir: string, ownerId: string): string {
  return join(baseDir, 'users', ownerId, 'cookiesFile');
}

export function userVideoDir(baseDir: string, ownerId: string): string {
  return join(baseDir, 'users', ownerId, 'videoFile');
}

export function ensureUserDirs(
  baseDir: string,
  ownerId: string,
): { cookiesDir: string; videoDir: string } {
  return {
    cookiesDir: userCookiesDir(baseDir, ownerId),
    videoDir: userVideoDir(baseDir, ownerId),
  };
}

/** 从 cookie 绝对路径解析 ownerId 与文件名 */
export function parseCookieStoragePath(accountFile: string): {
  ownerId: string;
  filePath: string;
} {
  const normalized = accountFile.replace(/\\/g, '/');
  const match = normalized.match(/\/users\/([^/]+)\/cookiesFile\/([^/]+)$/);
  if (match) {
    return { ownerId: match[1], filePath: match[2] };
  }
  return { ownerId: '', filePath: basename(accountFile) };
}
