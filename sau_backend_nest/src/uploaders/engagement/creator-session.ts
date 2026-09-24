import { existsSync } from 'fs';
import { Logger } from '@nestjs/common';
import type { Page, Response } from 'patchright';
import type { BrowserService } from '../../shared/browser/browser.service';
import { COOKIE_ERROR_HINT } from '../../shared/lock/account-cookie-lock.service';
import type { WorkLinkPlatform } from '../capture-work-link';
import type { CreatorWork } from './engagement.types';
import { collectWorksFromJson } from './work-list-parse';

const CREATOR_HOSTS = [
  'creator.xiaohongshu.com',
  'creator.douyin.com',
  'cp.kuaishou.com',
];

function looksLikeApi(url: string, contentType: string): boolean {
  if (contentType.includes('json') || contentType.includes('javascript')) {
    return true;
  }
  return /\/(api|web_api|rest|aweme|sns|creation|janus|edith|galaxy|mediams)\b/i.test(
    url,
  );
}

function cookieError(): Error {
  return new Error(COOKIE_ERROR_HINT);
}

async function assertCreatorLoggedIn(page: Page): Promise<void> {
  const url = page.url();
  let host = '';
  try {
    host = new URL(url).hostname;
  } catch {
    throw cookieError();
  }
  if (!CREATOR_HOSTS.some((allowed) => host.endsWith(allowed))) {
    throw cookieError();
  }
  if (/\/(login|passport)\b/i.test(url)) {
    throw cookieError();
  }
}

export async function withCreatorPage<T>(
  browserService: BrowserService,
  accountFile: string,
  fn: (page: Page) => Promise<T>,
): Promise<T> {
  if (!existsSync(accountFile)) {
    throw new Error('账号 Cookie 不存在，请重新登录');
  }
  const browser = await browserService.launchPatchright({ lang: 'en-GB' });
  const context = await browser.newContext({ storageState: accountFile });
  await browserService.addStealthScript(context);
  const page = await context.newPage();
  page.setDefaultTimeout(60000);
  try {
    return await fn(page);
  } finally {
    await page.close().catch(() => undefined);
    await context.close().catch(() => undefined);
    await browser.close().catch(() => undefined);
  }
}

export async function collectCreatorWorks(
  page: Page,
  platform: WorkLinkPlatform,
  manageUrl: string,
  logger: Logger,
  afterGoto?: (page: Page) => Promise<void>,
): Promise<CreatorWork[]> {
  const bag = new Map<string, CreatorWork>();
  const onResponse = (response: Response) => {
    void (async () => {
      try {
        if (response.status() < 200 || response.status() >= 400) {
          return;
        }
        const contentType = (
          response.headers()['content-type'] || ''
        ).toLowerCase();
        if (!looksLikeApi(response.url(), contentType)) {
          return;
        }
        const text = await response.text();
        const trimmed = text.trim();
        if (
          trimmed.length > 2_000_000 ||
          (!trimmed.startsWith('{') && !trimmed.startsWith('['))
        ) {
          return;
        }
        const payload = JSON.parse(trimmed) as unknown;
        const before = bag.size;
        collectWorksFromJson(payload, platform, bag);
        if (bag.size > before) {
          logger.debug(
            `${platform} 作品列表 +${bag.size - before} url=${response.url()}`,
          );
        }
      } catch {
        // 单条接口失败不影响整体
      }
    })();
  };

  page.on('response', onResponse);
  try {
    await page.goto(manageUrl, {
      waitUntil: 'domcontentloaded',
      timeout: 60000,
    });
    await assertCreatorLoggedIn(page);
    if (afterGoto) {
      await afterGoto(page);
    }
    const deadline = Date.now() + 10000;
    while (Date.now() < deadline && bag.size === 0) {
      await page.waitForTimeout(400);
    }
    await page.waitForTimeout(1500);
    return [...bag.values()];
  } finally {
    page.off('response', onResponse);
  }
}
