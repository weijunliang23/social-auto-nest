import type { WorkLinkPlatform } from '../capture-work-link';

const XHS_ID_RE = /^[0-9a-fA-F]{16,32}$/;
const DOUYIN_ID_RE = /^\d{10,25}$/;
const KUAISHOU_ID_RE = /^[0-9a-zA-Z_-]{6,32}$/;

export function parseWorkIdFromUrl(
  platform: WorkLinkPlatform,
  raw?: string,
): string | null {
  if (!raw) {
    return null;
  }
  try {
    const url = new URL(raw, 'https://example.com');
    if (platform === 'xiaohongshu') {
      const fromPath = url.pathname.match(
        /\/(?:explore|discovery\/item|item)\/([0-9a-fA-F]{16,32})/,
      );
      if (fromPath) {
        return fromPath[1];
      }
      for (const key of ['noteId', 'note_id', 'source_note_id', 'id']) {
        const value = url.searchParams.get(key);
        if (value && XHS_ID_RE.test(value)) {
          return value;
        }
      }
      return null;
    }
    if (platform === 'douyin') {
      const fromPath = url.pathname.match(/\/video\/(\d{10,25})/);
      if (fromPath) {
        return fromPath[1];
      }
      for (const key of ['aweme_id', 'item_id', 'awemeId']) {
        const value = url.searchParams.get(key);
        if (value && DOUYIN_ID_RE.test(value)) {
          return value;
        }
      }
      return null;
    }
    const fromPath = url.pathname.match(/\/short-video\/([^/?#]+)/);
    if (fromPath && KUAISHOU_ID_RE.test(fromPath[1])) {
      return fromPath[1];
    }
    for (const key of ['photoId', 'photo_id', 'workId']) {
      const value = url.searchParams.get(key);
      if (value && KUAISHOU_ID_RE.test(value)) {
        return value;
      }
    }
  } catch {
    return null;
  }
  return null;
}

export function publicWorkUrl(
  platform: WorkLinkPlatform,
  id: string,
): string {
  if (platform === 'xiaohongshu') {
    return `https://www.xiaohongshu.com/explore/${id}`;
  }
  if (platform === 'douyin') {
    return `https://www.douyin.com/video/${id}`;
  }
  return `https://www.kuaishou.com/short-video/${id}`;
}

export function isValidWorkId(
  platform: WorkLinkPlatform,
  id: string,
): boolean {
  if (platform === 'xiaohongshu') {
    return XHS_ID_RE.test(id);
  }
  if (platform === 'douyin') {
    return DOUYIN_ID_RE.test(id);
  }
  return KUAISHOU_ID_RE.test(id);
}

export function normalizeTitle(value: string): string {
  return value.replace(/\s+/g, '').replace(/[#＃]/g, '').toLowerCase();
}

export function titlesSimilar(a: string, b: string): boolean {
  const left = normalizeTitle(a);
  const right = normalizeTitle(b);
  if (!left || !right) {
    return false;
  }
  return left === right || left.includes(right) || right.includes(left);
}

export function withinTimeWindow(
  workTime: Date | null,
  expected: Date,
  hours = 2,
): boolean {
  if (!workTime) {
    return true;
  }
  return Math.abs(workTime.getTime() - expected.getTime()) <= hours * 3600 * 1000;
}
