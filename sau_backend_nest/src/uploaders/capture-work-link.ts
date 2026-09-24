import { Logger } from '@nestjs/common';
import { basename } from 'path';
import type { Page, Response } from 'patchright';
import type { WorkLink } from './work-link';

export type WorkLinkPlatform = 'xiaohongshu' | 'douyin' | 'kuaishou';

export interface WorkLinkSniffer {
  /** 之后到达的接口才计入，避免把上传过程中的旧作品当成这一条 */
  start(): void;
  waitForPublicUrl(timeoutMs?: number): Promise<string | null>;
  dispose(): void;
}

interface Candidate {
  id: string;
  score: number;
  at: number;
  source: string;
}

const XHS_ID_RE = /^[0-9a-fA-F]{16,32}$/;
const DOUYIN_ID_RE = /^\d{10,25}$/;
const KUAISHOU_ID_RE = /^[0-9a-zA-Z_-]{6,32}$/;

const XHS_NOTE_KEYS = new Set([
  'noteid',
  'note_id',
  'sourcenoteid',
  'source_note_id',
]);
const DOUYIN_ID_KEYS = new Set(['aweme_id', 'awemeid', 'item_id', 'itemid']);
const KUAISHOU_ID_KEYS = new Set(['photoid', 'photo_id', 'workid', 'work_id']);

function exploreUrl(noteId: string): string {
  return `https://www.xiaohongshu.com/explore/${noteId}`;
}

function douyinVideoUrl(id: string): string {
  return `https://www.douyin.com/video/${id}`;
}

function kuaishouVideoUrl(id: string): string {
  return `https://www.kuaishou.com/short-video/${id}`;
}

function publicUrl(platform: WorkLinkPlatform, id: string): string {
  if (platform === 'xiaohongshu') {
    return exploreUrl(id);
  }
  if (platform === 'douyin') {
    return douyinVideoUrl(id);
  }
  return kuaishouVideoUrl(id);
}

function normalizeKey(key: string): string {
  return key.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
}

function isValidId(platform: WorkLinkPlatform, key: string, value: unknown): boolean {
  if (typeof value !== 'string' && typeof value !== 'number') {
    return false;
  }
  const id = String(value).trim();
  const k = normalizeKey(key);
  if (platform === 'xiaohongshu') {
    if (!XHS_ID_RE.test(id)) {
      return false;
    }
    return XHS_NOTE_KEYS.has(k) || k === 'id' || k === 'noteid';
  }
  if (platform === 'douyin') {
    return DOUYIN_ID_KEYS.has(k) && DOUYIN_ID_RE.test(id);
  }
  return KUAISHOU_ID_KEYS.has(k) && KUAISHOU_ID_RE.test(id);
}

function scoreFor(url: string, key: string, listIndex: number | null): number {
  const u = url.toLowerCase();
  let score = 20;
  if (
    /publish|create|submit|post_create|postcreate|finish|success/.test(u)
  ) {
    score += 80;
  }
  if (/note|aweme|photo|item|work/.test(u)) {
    score += 20;
  }
  if (/list|manage|feed|works/.test(u)) {
    score += 10;
  }
  const k = normalizeKey(key);
  if (k !== 'id') {
    score += 15;
  }
  if (listIndex === 0) {
    score += 5;
  }
  return score;
}

function looksLikeApi(url: string, contentType: string): boolean {
  if (contentType.includes('json') || contentType.includes('javascript')) {
    return true;
  }
  return /\/(api|web_api|rest|aweme|sns|creation|janus|edith)\b/i.test(url);
}

function walkJson(
  value: unknown,
  visit: (key: string, val: unknown, listIndex: number | null) => void,
  listIndex: number | null = null,
  depth = 0,
): void {
  if (value == null || depth > 10) {
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      if (index > 0) {
        return;
      }
      walkJson(item, visit, 0, depth + 1);
    });
    return;
  }
  if (typeof value !== 'object') {
    return;
  }
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    visit(key, child, listIndex);
    walkJson(child, visit, listIndex, depth + 1);
  }
}

function collectIdsFromJson(
  platform: WorkLinkPlatform,
  payload: unknown,
  sourceUrl: string,
): Candidate[] {
  const found: Candidate[] = [];
  walkJson(payload, (key, val, listIndex) => {
    if (typeof val === 'string' && /^https?:\/\//i.test(val)) {
      for (const item of collectIdsFromUrl(platform, val)) {
        found.push({
          ...item,
          score: item.score + scoreFor(sourceUrl, key, listIndex) / 4,
          source: sourceUrl,
        });
      }
    }
    if (!isValidId(platform, key, val)) {
      return;
    }
    if (platform === 'xiaohongshu' && normalizeKey(key) === 'id') {
      if (!/note|publish|creation|sns/i.test(sourceUrl)) {
        return;
      }
    }
    found.push({
      id: String(val).trim(),
      score: scoreFor(sourceUrl, key, listIndex),
      at: Date.now(),
      source: sourceUrl,
    });
  });
  return found;
}

function collectIdsFromUrl(
  platform: WorkLinkPlatform,
  raw: string,
): Candidate[] {
  const found: Candidate[] = [];
  try {
    const url = new URL(raw, 'https://example.com');
    const params =
      platform === 'xiaohongshu'
        ? ['noteId', 'note_id', 'source_note_id', 'id']
        : platform === 'douyin'
          ? ['aweme_id', 'item_id', 'awemeId']
          : ['photoId', 'photo_id', 'workId'];
    for (const key of params) {
      const value = url.searchParams.get(key);
      if (value && isValidId(platform, key, value)) {
        found.push({
          id: value,
          score: scoreFor(raw, key, null) + 10,
          at: Date.now(),
          source: raw,
        });
      }
    }
    const pathMatch =
      platform === 'xiaohongshu'
        ? url.pathname.match(/\/(?:explore|discovery\/item|item)\/([0-9a-fA-F]{16,32})/)
        : platform === 'douyin'
          ? url.pathname.match(/\/video\/(\d{10,25})/)
          : url.pathname.match(/\/short-video\/([^/?#]+)/);
    if (pathMatch) {
      found.push({
        id: pathMatch[1],
        score: 90,
        at: Date.now(),
        source: raw,
      });
    }
  } catch {
    // ignore
  }
  return found;
}

function pickBest(candidates: Candidate[]): string | null {
  if (!candidates.length) {
    return null;
  }
  return [...candidates].sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    return b.at - a.at;
  })[0].id;
}

/** 从成功页 URL、查看笔记链接或页面文案里取出小红书笔记地址 */
export function xiaohongshuPublicUrlFromText(raw: string): string | null {
  const ids = collectIdsFromUrl('xiaohongshu', raw);
  if (ids.length) {
    return exploreUrl(ids[0].id);
  }
  const embedded = raw.match(
    /(?:noteId|note_id|source_note_id)["'=:\s]+([0-9a-fA-F]{16,32})/,
  );
  return embedded ? exploreUrl(embedded[1]) : null;
}

export function attachWorkLinkSniffer(
  page: Page,
  platform: WorkLinkPlatform,
  logger: Logger,
): WorkLinkSniffer {
  const candidates: Candidate[] = [];
  let armed = false;
  let disposed = false;

  const onResponse = (response: Response) => {
    void (async () => {
      if (disposed || !armed) {
        return;
      }
      try {
        const url = response.url();
        if (response.status() < 200 || response.status() >= 400) {
          return;
        }
        candidates.push(...collectIdsFromUrl(platform, url));
        const contentType = (
          response.headers()['content-type'] || ''
        ).toLowerCase();
        if (!looksLikeApi(url, contentType)) {
          return;
        }
        let payload: unknown;
        try {
          const text = await response.text();
          const trimmed = text.trim();
          if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) {
            return;
          }
          payload = JSON.parse(trimmed);
        } catch {
          return;
        }
        const fromJson = collectIdsFromJson(platform, payload, url);
        if (fromJson.length) {
          logger.debug(
            `接口抓到作品 ID ${fromJson.map((c) => c.id).join(',')} url=${url}`,
          );
        }
        candidates.push(...fromJson);
      } catch {
        // 读响应失败不影响发布
      }
    })();
  };

  page.on('response', onResponse);

  return {
    start() {
      armed = true;
    },
    async waitForPublicUrl(timeoutMs = 8000) {
      const deadline = Date.now() + timeoutMs;
      while (Date.now() < deadline) {
        candidates.push(...collectIdsFromUrl(platform, page.url()));
        const id = pickBest(candidates);
        if (id) {
          const url = publicUrl(platform, id);
          logger.log(`已解析作品链接 ${url}`);
          return url;
        }
        await page.waitForTimeout(400);
      }
      candidates.push(...collectIdsFromUrl(platform, page.url()));
      const id = pickBest(candidates);
      return id ? publicUrl(platform, id) : null;
    },
    dispose() {
      disposed = true;
      page.off('response', onResponse);
    },
  };
}

function toWorkLink(
  url: string,
  accountFile: string,
  filePath?: string,
): WorkLink {
  const link: WorkLink = {
    account: basename(accountFile),
    url,
    kind: 'public',
  };
  if (filePath) {
    link.file = basename(filePath);
  }
  return link;
}

async function captureFromDom(
  page: Page,
  platform: WorkLinkPlatform,
): Promise<string | null> {
  if (platform === 'xiaohongshu') {
    const fromLocation = xiaohongshuPublicUrlFromText(page.url());
    if (fromLocation) {
      return fromLocation;
    }
    const hrefs = await page
      .locator('a[href*="xiaohongshu.com"], a[href*="/explore/"]')
      .evaluateAll((els) =>
        els.map(
          (el) =>
            (el as HTMLAnchorElement).href || el.getAttribute('href') || '',
        ),
      )
      .catch(() => [] as string[]);
    for (const href of hrefs) {
      const parsed = xiaohongshuPublicUrlFromText(href);
      if (parsed) {
        return parsed;
      }
    }
    return xiaohongshuPublicUrlFromText(await page.content().catch(() => ''));
  }

  return page
    .evaluate((kind) => {
      const html = document.documentElement?.innerHTML ?? '';
      if (kind === 'douyin') {
        const fromHref = html.match(/\/video\/(\d{10,25})/);
        if (fromHref) {
          return fromHref[1];
        }
        return html.match(/"aweme_id"\s*:\s*"(\d+)"/)?.[1] ?? null;
      }
      const fromPath = html.match(/short-video\/([^/?#"']+)/);
      if (fromPath) {
        return fromPath[1];
      }
      return (
        html.match(/"photoId"\s*:\s*"([^"]+)"/)?.[1] ??
        html.match(/photoId=([^&"']+)/)?.[1] ??
        null
      );
    }, platform)
    .then((id) => (id ? publicUrl(platform, id) : null))
    .catch(() => null);
}

export async function finishPublicWorkLink(
  sniffer: WorkLinkSniffer | undefined,
  page: Page,
  logger: Logger,
  platform: WorkLinkPlatform,
  accountFile: string,
  filePath?: string,
): Promise<WorkLink | null> {
  try {
    const fromApi = sniffer ? await sniffer.waitForPublicUrl(8000) : null;
    if (fromApi) {
      return toWorkLink(fromApi, accountFile, filePath);
    }
    const fromDom = await captureFromDom(page, platform);
    if (fromDom) {
      logger.log(`已从页面解析作品链接 ${fromDom}`);
      return toWorkLink(fromDom, accountFile, filePath);
    }
    const label =
      platform === 'xiaohongshu'
        ? '小红书成功页'
        : platform === 'douyin'
          ? '抖音作品列表'
          : '快手作品列表';
    logger.warn(`未从${label}解析到作品链接`);
    return null;
  } catch (e) {
    logger.warn(
      `抓取作品链接失败: ${e instanceof Error ? e.message : String(e)}`,
    );
    return null;
  }
}
