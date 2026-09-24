import type { WorkLinkPlatform } from '../capture-work-link';
import type { CreatorWork } from './engagement.types';
import { isValidWorkId } from './work-identity';

const ID_KEYS: Record<WorkLinkPlatform, string[]> = {
  xiaohongshu: ['noteid', 'note_id', 'sourcenoteid', 'source_note_id', 'id'],
  douyin: ['aweme_id', 'awemeid', 'item_id', 'itemid'],
  kuaishou: ['photoid', 'photo_id', 'workid', 'work_id', 'id'],
};

const TITLE_KEYS = ['title', 'displaytitle', 'desc', 'description', 'caption', 'name'];
const PLAY_KEYS = [
  'viewcount',
  'view_count',
  'playcount',
  'play_count',
  'readcount',
  'read_count',
  'impressioncount',
  'vv',
  'playcnt',
];
const LIKE_KEYS = [
  'likecount',
  'like_count',
  'likedcount',
  'liked_count',
  'diggcount',
  'digg_count',
  'likecnt',
];
const COMMENT_KEYS = ['commentcount', 'comment_count', 'commentcnt'];
const COLLECT_KEYS = [
  'collectcount',
  'collect_count',
  'collectedcount',
  'collected_count',
  'favoritecount',
  'favorite_count',
  'collectcnt',
];
const SHARE_KEYS = [
  'sharecount',
  'share_count',
  'forwardcount',
  'forward_count',
  'sharecnt',
];
const TIME_KEYS = [
  'time',
  'createtime',
  'create_time',
  'publishtime',
  'publish_time',
  'timestamp',
  'createdat',
];

function normalizeKey(key: string): string {
  return key.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
}

function toNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.round(value);
  }
  if (typeof value !== 'string') {
    return null;
  }
  const text = value.trim();
  if (!text || text === '—' || text === '-') {
    return null;
  }
  const wan = text.match(/^([\d.]+)\s*万/);
  if (wan) {
    return Math.round(parseFloat(wan[1]) * 10000);
  }
  const parsed = Number(text.replace(/,/g, ''));
  return Number.isFinite(parsed) ? Math.round(parsed) : null;
}

function pickByKeys(
  obj: Record<string, unknown>,
  keys: string[],
): unknown {
  const map = new Map<string, unknown>();
  for (const [key, val] of Object.entries(obj)) {
    map.set(normalizeKey(key), val);
  }
  for (const key of keys) {
    if (map.has(key)) {
      return map.get(key);
    }
  }
  return undefined;
}

function toDate(value: unknown): Date | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value;
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    const ms = value < 1e12 ? value * 1000 : value;
    const date = new Date(ms);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  if (typeof value === 'string' && value.trim()) {
    const asNum = Number(value);
    if (Number.isFinite(asNum) && asNum > 1e9) {
      return toDate(asNum);
    }
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  return null;
}

function pickId(
  obj: Record<string, unknown>,
  platform: WorkLinkPlatform,
): string | null {
  const raw = pickByKeys(obj, ID_KEYS[platform]);
  if (raw == null) {
    return null;
  }
  const id = String(raw).trim();
  return isValidWorkId(platform, id) ? id : null;
}

function tryParseWork(
  obj: Record<string, unknown>,
  platform: WorkLinkPlatform,
): CreatorWork | null {
  const id = pickId(obj, platform);
  if (!id) {
    return null;
  }
  const titleRaw = pickByKeys(obj, TITLE_KEYS);
  const title = typeof titleRaw === 'string' ? titleRaw.trim() : '';
  const playCount = toNumber(pickByKeys(obj, PLAY_KEYS));
  const likeCount = toNumber(pickByKeys(obj, LIKE_KEYS));
  const commentCount = toNumber(pickByKeys(obj, COMMENT_KEYS));
  const collectCount = toNumber(pickByKeys(obj, COLLECT_KEYS));
  const shareCount = toNumber(pickByKeys(obj, SHARE_KEYS));
  const hasStat =
    playCount != null ||
    likeCount != null ||
    commentCount != null ||
    collectCount != null ||
    shareCount != null;
  if (!title && !hasStat) {
    return null;
  }
  return {
    id,
    title,
    publishedAt: toDate(pickByKeys(obj, TIME_KEYS)),
    playCount,
    likeCount,
    commentCount,
    collectCount,
    shareCount,
  };
}

function mergeWork(prev: CreatorWork | undefined, next: CreatorWork): CreatorWork {
  if (!prev) {
    return next;
  }
  return {
    id: next.id,
    title: next.title || prev.title,
    publishedAt: next.publishedAt ?? prev.publishedAt,
    playCount: next.playCount ?? prev.playCount,
    likeCount: next.likeCount ?? prev.likeCount,
    commentCount: next.commentCount ?? prev.commentCount,
    collectCount: next.collectCount ?? prev.collectCount,
    shareCount: next.shareCount ?? prev.shareCount,
  };
}

export function collectWorksFromJson(
  payload: unknown,
  platform: WorkLinkPlatform,
  bag: Map<string, CreatorWork>,
  depth = 0,
): void {
  if (payload == null || depth > 12) {
    return;
  }
  if (Array.isArray(payload)) {
    for (const item of payload) {
      collectWorksFromJson(item, platform, bag, depth + 1);
    }
    return;
  }
  if (typeof payload !== 'object') {
    return;
  }
  const obj = payload as Record<string, unknown>;
  const parsed = tryParseWork(obj, platform);
  if (parsed) {
    bag.set(parsed.id, mergeWork(bag.get(parsed.id), parsed));
  }
  for (const child of Object.values(obj)) {
    collectWorksFromJson(child, platform, bag, depth + 1);
  }
}
