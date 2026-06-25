import { Inject, Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { join } from 'path';
import { randomUUID } from 'crypto';
import { mkdirSync } from 'fs';
import type { AppConfig } from '../../config/app-config.interface';
import appConfig from '../../config/app.config';
import { PlatformAccount } from '../../database/schemas/platform-account.schema';
import { BrowserService } from '../../shared/browser/browser.service';
import { userCookiesDir } from '../../shared/paths/user-paths.util';
import { toObjectId } from '../../shared/utils/object-id.util';
import {
  MEDIA_DOUYIN,
  MEDIA_KUAISHOU,
  MEDIA_TENCENT,
  MEDIA_TYPE,
  MEDIA_XHS,
} from '../../shared/platform.constants';
import { AuthService } from './auth.service';

type SseMessageCallback = (msg: string) => void;

export interface LoginOptions {
  ownerId: string;
  /** true 时强制有头浏览器（headless=false） */
  browserLogin?: boolean;
}

type PlatformLoginHandler = (
  id: string,
  onMessage: SseMessageCallback,
  session: ActiveLogin,
) => Promise<void>;

interface ActiveLogin {
  cancelled: boolean;
  headless: boolean;
  ownerId: string;
}

/** 兼容 patchright / playwright 的 Page 最小接口 */
interface NavigablePage {
  url: () => string;
  mainFrame: () => { url: () => string };
  on: (
    event: 'framenavigated',
    handler: (frame: { url: () => string }) => void,
  ) => void;
  off: (
    event: 'framenavigated',
    handler: (frame: { url: () => string }) => void,
  ) => void;
}

const LOGIN_TIMEOUT_MS = 200_000;

/** 四平台扫码登录，通过回调推送 SSE 消息 */
@Injectable()
export class LoginService {
  private readonly logger = new Logger(LoginService.name);
  /** 活跃登录会话，key 为 ownerId:账号名 */
  private readonly activeLogins = new Map<string, ActiveLogin>();

  /** 平台 type → 扫码登录处理器 */
  private readonly platformLoginHandlers: Record<string, PlatformLoginHandler> =
    {
      [MEDIA_XHS]: (...args) => this.xiaohongshuCookieGen(...args),
      [MEDIA_TENCENT]: (...args) => this.getTencentCookie(...args),
      [MEDIA_DOUYIN]: (...args) => this.douyinCookieGen(...args),
      [MEDIA_KUAISHOU]: (...args) => this.getKsCookie(...args),
    };

  constructor(
    private readonly browser: BrowserService,
    private readonly authService: AuthService,
    @InjectModel(PlatformAccount.name)
    private readonly platformAccountModel: Model<PlatformAccount>,
    @Inject(appConfig.KEY)
    private readonly app: AppConfig,
  ) {}

  private sessionKey(ownerId: string, id: string): string {
    return `${ownerId}:${id}`;
  }

  private cookiesDir(ownerId: string): string {
    return userCookiesDir(this.app.baseDir, ownerId);
  }

  /** 启动扫码登录，type 为字符串 '1'~'4'，id 为账号名 */
  startLogin(
    type: string,
    id: string,
    onMessage: SseMessageCallback,
    options: LoginOptions,
  ): void {
    const key = this.sessionKey(options.ownerId, id);
    const session: ActiveLogin = {
      cancelled: false,
      headless: this.browser.resolveHeadless(options.browserLogin),
      ownerId: options.ownerId,
    };
    this.activeLogins.set(key, session);

    void this.runLogin(type, id, onMessage, session).finally(() => {
      this.activeLogins.delete(key);
    });
  }

  /** 取消指定账号的登录任务 */
  cancelLogin(ownerId: string, id: string): void {
    const session = this.activeLogins.get(this.sessionKey(ownerId, id));
    if (session) {
      session.cancelled = true;
    }
  }

  private async runLogin(
    type: string,
    id: string,
    onMessage: SseMessageCallback,
    session: ActiveLogin,
  ): Promise<void> {
    try {
      const handler = this.platformLoginHandlers[type];
      if (handler) {
        await handler(id, onMessage, session);
      } else {
        onMessage('500');
      }
    } catch (e) {
      this.logger.error(
        `登录失败 type=${type} id=${id}: ${e instanceof Error ? e.message : String(e)}`,
      );
      onMessage('500');
    }
  }

  /** 开始监听主框架 URL 变化，返回 Promise，超时或取消则 resolve(false) */
  private startUrlChangeWait(
    page: NavigablePage,
    originalUrl: string,
    session: ActiveLogin,
  ): Promise<boolean> {
    return new Promise((resolve) => {
      if (session.cancelled) {
        resolve(false);
        return;
      }

      const timer = setTimeout(() => {
        cleanup();
        resolve(false);
      }, LOGIN_TIMEOUT_MS);

      const onFrameNavigated = (frame: { url: () => string }) => {
        if (frame === page.mainFrame() && frame.url() !== originalUrl) {
          cleanup();
          resolve(true);
        }
      };

      const cleanup = () => {
        clearTimeout(timer);
        page.off('framenavigated', onFrameNavigated);
      };

      page.on('framenavigated', onFrameNavigated);
    });
  }

  /** 保存 cookie 并写入 platform_accounts，成功返回 true */
  private async saveCookieAndRecord(
    platformType: number,
    userName: string,
    ownerId: string,
    context: { storageState: (opts: { path: string }) => Promise<unknown> },
    onMessage: SseMessageCallback,
    headless: boolean,
  ): Promise<boolean> {
    const cookiesDir = this.cookiesDir(ownerId);
    mkdirSync(cookiesDir, { recursive: true });
    const fileName = `${randomUUID()}.json`;
    const cookiePath = join(cookiesDir, fileName);
    await context.storageState({ path: cookiePath });

    const valid = await this.authService.checkCookie(platformType, fileName, {
      headless,
      ownerId,
    });
    if (!valid) {
      onMessage('500');
      return false;
    }

    await this.platformAccountModel.create({
      ownerId: toObjectId(ownerId),
      type: platformType,
      filePath: fileName,
      userName,
      status: 1,
    });

    this.logger.log(`用户状态已记录: ${userName} (${fileName})`);
    onMessage('200');
    return true;
  }

  /** 抖音扫码登录 */
  private async douyinCookieGen(
    id: string,
    onMessage: SseMessageCallback,
    session: ActiveLogin,
  ): Promise<void> {
    const browser = await this.browser.launchPatchright({
      antiDetect: true,
      headless: session.headless,
    });
    try {
      const context = await browser.newContext();
      await this.browser.addStealthScript(context);
      const page = await context.newPage();
      await page.goto('https://creator.douyin.com/');
      const originalUrl = page.url();

      const src = await page
        .getByRole('img', { name: '二维码' })
        .getAttribute('src');
      if (!src) {
        onMessage('500');
        return;
      }
      this.logger.log(`[抖音] 二维码地址: ${src}`);
      onMessage(src);

      const changed = await this.startUrlChangeWait(page, originalUrl, session);
      if (!changed || session.cancelled) {
        onMessage('500');
        return;
      }

      await this.saveCookieAndRecord(
        MEDIA_TYPE.DOUYIN,
        id,
        session.ownerId,
        context,
        onMessage,
        session.headless,
      );
    } finally {
      await browser.close().catch(() => undefined);
    }
  }

  /** 视频号扫码登录 */
  private async getTencentCookie(
    id: string,
    onMessage: SseMessageCallback,
    session: ActiveLogin,
  ): Promise<void> {
    const browser = await this.browser.launchPlaywright({
      lang: 'en-GB',
      headless: session.headless,
    });
    try {
      const context = await browser.newContext();
      await this.browser.addStealthScript(context);
      const page = await context.newPage();
      await page.goto('https://channels.weixin.qq.com');
      const originalUrl = page.url();
      const urlChanged = this.startUrlChangeWait(page, originalUrl, session);

      const iframeLocator = page.frameLocator('iframe').first();
      const src = await iframeLocator
        .getByRole('img')
        .first()
        .getAttribute('src');
      if (!src) {
        onMessage('500');
        return;
      }
      this.logger.log(`[视频号] 二维码地址: ${src}`);
      onMessage(src);

      const changed = await urlChanged;
      if (!changed || session.cancelled) {
        onMessage('500');
        return;
      }

      await this.saveCookieAndRecord(
        MEDIA_TYPE.TENCENT,
        id,
        session.ownerId,
        context,
        onMessage,
        session.headless,
      );
    } finally {
      await browser.close().catch(() => undefined);
    }
  }

  /** 快手扫码登录 */
  private async getKsCookie(
    id: string,
    onMessage: SseMessageCallback,
    session: ActiveLogin,
  ): Promise<void> {
    const browser = await this.browser.launchPatchright({
      lang: 'en-GB',
      headless: session.headless,
    });
    try {
      const context = await browser.newContext();
      await this.browser.addStealthScript(context);
      const page = await context.newPage();
      await page.goto('https://cp.kuaishou.com');
      await page.getByRole('link', { name: '立即登录' }).click();
      await page.getByText('扫码登录').click();

      const src = await page
        .getByRole('img', { name: 'qrcode' })
        .getAttribute('src');
      const originalUrl = page.url();
      if (!src) {
        onMessage('500');
        return;
      }
      this.logger.log(`[快手] 二维码地址: ${src}`);
      onMessage(src);

      const changed = await this.startUrlChangeWait(page, originalUrl, session);
      if (!changed || session.cancelled) {
        onMessage('500');
        return;
      }

      await this.saveCookieAndRecord(
        MEDIA_TYPE.KUAISHOU,
        id,
        session.ownerId,
        context,
        onMessage,
        session.headless,
      );
    } finally {
      await browser.close().catch(() => undefined);
    }
  }

  /** 小红书扫码登录 */
  private async xiaohongshuCookieGen(
    id: string,
    onMessage: SseMessageCallback,
    session: ActiveLogin,
  ): Promise<void> {
    const browser = await this.browser.launchPatchright({
      lang: 'en-GB',
      headless: session.headless,
    });
    try {
      const context = await browser.newContext();
      await this.browser.addStealthScript(context);
      const page = await context.newPage();
      await page.goto('https://creator.xiaohongshu.com/');
      await page.locator('img.css-wemwzq').click();

      const src = await page.getByRole('img').nth(2).getAttribute('src');
      const originalUrl = page.url();
      if (!src) {
        onMessage('500');
        return;
      }
      this.logger.log(`[小红书] 二维码地址: ${src}`);
      onMessage(src);

      const changed = await this.startUrlChangeWait(page, originalUrl, session);
      if (!changed || session.cancelled) {
        onMessage('500');
        return;
      }

      await this.saveCookieAndRecord(
        MEDIA_TYPE.XHS,
        id,
        session.ownerId,
        context,
        onMessage,
        session.headless,
      );
    } finally {
      await browser.close().catch(() => undefined);
    }
  }
}
