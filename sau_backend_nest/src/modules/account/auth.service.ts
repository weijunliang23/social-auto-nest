import { Inject, Injectable, Logger } from '@nestjs/common';
import { join } from 'path';
import type { AppConfig } from '../../config/app-config.interface';
import appConfig from '../../config/app.config';
import { BrowserService } from '../../shared/browser/browser.service';
import { userCookiesDir } from '../../shared/paths/user-paths.util';
import {
  MEDIA_DOUYIN,
  MEDIA_KUAISHOU,
  MEDIA_TENCENT,
  MEDIA_XHS,
} from '../../shared/platform.constants';

export interface CookieCheckOptions {
  headless?: boolean;
  ownerId: string;
}

type CookieAuthHandler = (
  accountFile: string,
  headless?: boolean,
) => Promise<boolean>;

/** 四平台 Cookie 有效性校验，移植自 myUtils/auth.py */
@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  /** 平台 type → cookie 校验处理器 */
  private readonly platformCookieAuthHandlers: Record<string, CookieAuthHandler> =
    {
      [MEDIA_XHS]: (...args) => this.cookieAuthXhs(...args),
      [MEDIA_TENCENT]: (...args) => this.cookieAuthTencent(...args),
      [MEDIA_DOUYIN]: (...args) => this.cookieAuthDouyin(...args),
      [MEDIA_KUAISHOU]: (...args) => this.cookieAuthKs(...args),
    };

  constructor(
    private readonly browser: BrowserService,
    @Inject(appConfig.KEY)
    private readonly app: AppConfig,
  ) { }

  /** 解析 Cookie 文件绝对路径 */
  private resolveCookiePath(ownerId: string, filePath: string): string {
    return join(userCookiesDir(this.app.baseDir, ownerId), filePath);
  }

  /** 按平台 type 分发 cookie 校验：1小红书 2视频号 3抖音 4快手 */
  async checkCookie(
    type: number,
    filePath: string,
    opts: CookieCheckOptions,
  ): Promise<boolean> {
    const accountFile = this.resolveCookiePath(opts.ownerId, filePath);
    const handler = this.platformCookieAuthHandlers[String(type)];
    if (handler) {
      return handler(accountFile, opts?.headless);
    }
    return false;
  }

  /** 抖音 cookie 校验：访问上传页，出现「扫码登录」则失效 */
  private async cookieAuthDouyin(
    accountFile: string,
    headless?: boolean,
  ): Promise<boolean> {
    const browser = await this.browser.launchPatchright({ headless });
    try {
      const context = await browser.newContext({ storageState: accountFile });
      await this.browser.addStealthScript(context);
      const page = await context.newPage();
      await page.goto(
        'https://creator.douyin.com/creator-micro/content/upload',
      );
      try {
        await page.waitForURL(
          'https://creator.douyin.com/creator-micro/content/upload',
          { timeout: 5000 },
        );
        try {
          await page.getByText('扫码登录').waitFor({ timeout: 5000 });
          this.logger.warn('[抖音] cookie 失效，需要扫码登录');
          return false;
        } catch {
          this.logger.log('[抖音] cookie 有效');
          return true;
        }
      } catch {
        this.logger.warn('[抖音] 等待5秒 cookie 失效');
        return false;
      } finally {
        await page.close().catch(() => undefined);
        await context.close().catch(() => undefined);
      }
    } finally {
      await browser.close().catch(() => undefined);
    }
  }

  /** 视频号 cookie 校验：出现「微信小店」则失效 */
  private async cookieAuthTencent(
    accountFile: string,
    headless?: boolean,
  ): Promise<boolean> {
    const browser = await this.browser.launchPlaywright({ headless });
    try {
      const context = await browser.newContext({ storageState: accountFile });
      await this.browser.addStealthScript(context);
      const page = await context.newPage();
      await page.goto('https://channels.weixin.qq.com/platform/post/create');
      try {
        await page
          .locator('div.title-name:has-text("微信小店")')
          .waitFor({ timeout: 5000 });
        this.logger.warn('[视频号] cookie 失效');
        return false;
      } catch {
        this.logger.log('[视频号] cookie 有效!');
        return true;
      } finally {
        await page.close().catch(() => undefined);
        await context.close().catch(() => undefined);
      }
    } finally {
      await browser.close().catch(() => undefined);
    }
  }

  /** 快手 cookie 校验：出现「机构服务」则失效 */
  private async cookieAuthKs(
    accountFile: string,
    headless?: boolean,
  ): Promise<boolean> {
    const browser = await this.browser.launchPatchright({
      lang: 'en-GB',
      headless,
    });
    try {
      const context = await browser.newContext({ storageState: accountFile });
      await this.browser.addStealthScript(context);
      const page = await context.newPage();
      await page.goto('https://cp.kuaishou.com/article/publish/video');
      try {
        await page
          .locator("div.names div.container div.name:text('机构服务')")
          .waitFor({ timeout: 5000 });
        this.logger.warn('[快手] cookie 失效');
        return false;
      } catch {
        this.logger.log('[快手] cookie 有效');
        return true;
      } finally {
        await page.close().catch(() => undefined);
        await context.close().catch(() => undefined);
      }
    } finally {
      await browser.close().catch(() => undefined);
    }
  }

  /** 小红书 cookie 校验：出现「手机号登录」或「扫码登录」则失效 */
  private async cookieAuthXhs(
    accountFile: string,
    headless?: boolean,
  ): Promise<boolean> {
    const browser = await this.browser.launchPatchright({
      lang: 'en-GB',
      headless,
    });
    try {
      const context = await browser.newContext({ storageState: accountFile });
      await this.browser.addStealthScript(context);
      const page = await context.newPage();
      try {
        await page.goto(
          'https://creator.xiaohongshu.com/creator-micro/content/upload',
        );
        try {
          await page.waitForURL(
            'https://creator.xiaohongshu.com/creator-micro/content/upload',
            { timeout: 5000 },
          );
        } catch {
          this.logger.warn('[小红书] 等待5秒 cookie 失效');
          return false;
        }

        const phoneLogin = await page.getByText('手机号登录').count();
        const qrLogin = await page.getByText('扫码登录').count();
        if (phoneLogin > 0 || qrLogin > 0) {
          this.logger.warn('[小红书] cookie 失效');
          return false;
        }
        this.logger.log('[小红书] cookie 有效');
        return true;
      } finally {
        await page.close().catch(() => undefined);
        await context.close().catch(() => undefined);
      }
    } finally {
      await browser.close().catch(() => undefined);
    }
  }
}
