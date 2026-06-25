import { existsSync } from 'fs';
import { Logger } from '@nestjs/common';
import { basename } from 'path';
import type { Page } from 'patchright';
import type { AuthService } from '../../modules/account/auth.service';
import type { AppConfig } from '../../config/app-config.interface';
import type { BrowserService } from '../../shared/browser/browser.service';
import { MEDIA_TYPE } from '../../shared/platform.constants';
import { parseCookieStoragePath } from '../../shared/paths/user-paths.util';
import { BaseUploader } from '../base/base-uploader';
import {
  XHS_PUBLISH_SUCCESS_URL_PATTERN,
  XIAOHONGSHU_PUBLISH_STRATEGY_IMMEDIATE,
  XIAOHONGSHU_PUBLISH_STRATEGY_SCHEDULED,
} from './xiaohongshu.constants';

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export abstract class XiaohongshuBaseUploader extends BaseUploader {
  protected readonly logger = new Logger(this.constructor.name);
  protected publishDate: Date | 0;
  protected readonly accountFile: string;
  protected readonly publishStrategy: string;
  protected readonly debug: boolean;
  protected readonly browserPublish: boolean;
  protected title = '';
  protected desc = '';
  protected tags: string[] = [];

  constructor(
    protected readonly browserService: BrowserService,
    protected readonly authService: AuthService,
    protected readonly appConfig: AppConfig,
    opts: {
      publishDate: Date | 0;
      accountFile: string;
      publishStrategy?: string;
      debug?: boolean;
      browserPublish?: boolean;
    },
  ) {
    super();
    this.publishDate = opts.publishDate;
    this.accountFile = opts.accountFile;
    this.publishStrategy =
      opts.publishStrategy ?? XIAOHONGSHU_PUBLISH_STRATEGY_IMMEDIATE;
    this.debug = opts.debug ?? this.appConfig.debugMode;
    this.browserPublish = opts.browserPublish ?? false;
  }

  protected resolveHeadless(): boolean {
    return this.browserService.resolveHeadless(this.browserPublish);
  }

  protected cookieRelativePath(): string {
    const idx = this.accountFile.indexOf('cookiesFile');
    if (idx >= 0) {
      return this.accountFile.slice(idx + 'cookiesFile'.length + 1);
    }
    return basename(this.accountFile);
  }

  protected async validateBaseArgs(): Promise<void> {
    if (!existsSync(this.accountFile)) {
      throw new Error(
        `cookie文件不存在，请先完成小红书登录: ${this.accountFile}`,
      );
    }
    const { ownerId, filePath } = parseCookieStoragePath(this.accountFile);
    const valid = await this.authService.checkCookie(
      MEDIA_TYPE.XHS,
      filePath,
      { ownerId },
    );
    if (!valid) {
      throw new Error(
        `cookie文件已失效，请先完成小红书登录: ${this.accountFile}`,
      );
    }
    if (
      this.publishStrategy !== XIAOHONGSHU_PUBLISH_STRATEGY_IMMEDIATE &&
      this.publishStrategy !== XIAOHONGSHU_PUBLISH_STRATEGY_SCHEDULED
    ) {
      throw new Error(`不支持的发布策略: ${this.publishStrategy}`);
    }
    if (this.publishStrategy === XIAOHONGSHU_PUBLISH_STRATEGY_SCHEDULED) {
      this.publishDate = BaseUploader.validatePublishDate(this.publishDate);
    } else {
      this.publishDate = 0;
    }
  }

  protected async setScheduleTime(
    page: Page,
    publishDate: Date,
  ): Promise<void> {
    this.logger.log(`设置定时发布时间: ${publishDate.toISOString()}`);
    await page
      .locator('.custom-switch-card')
      .filter({ hasText: '定时发布' })
      .locator('.d-switch')
      .click();
    await sleep(1000);
    const publishDateHour = `${publishDate.getFullYear()}-${String(publishDate.getMonth() + 1).padStart(2, '0')}-${String(publishDate.getDate()).padStart(2, '0')} ${String(publishDate.getHours()).padStart(2, '0')}:${String(publishDate.getMinutes()).padStart(2, '0')}`;
    const timeInput = page.locator('.d-datepicker-input-filter input.d-text');
    await timeInput.fill(publishDateHour);
    await sleep(1000);
  }

  protected async fillTitle(page: Page): Promise<void> {
    const titleContainer = page.locator('input[placeholder*="填写标题"]');
    await titleContainer.fill(this.title.slice(0, 20));
  }

  protected async fillDesc(page: Page): Promise<void> {
    if (!this.desc) {
      return;
    }
    const descLocator = page.locator('p[data-placeholder*="输入正文描述"]');
    await descLocator.click();
    await page.keyboard.press('Backspace');
    await page.keyboard.press('Control+KeyA');
    await page.keyboard.press('Delete');
    await page.keyboard.type(this.desc);
    await page.keyboard.press('Enter');
  }

  protected async fillTags(page: Page): Promise<void> {
    if (!this.tags.length) {
      return;
    }
    if (!this.desc) {
      const descLocator = page.locator('p[data-placeholder*="输入正文描述"]');
      await descLocator.click();
    }
    await page.keyboard.type(`#${this.tags[0]}`, { delay: 30 });
    await page
      .locator('#creator-editor-topic-container')
      .waitFor({ state: 'visible', timeout: 3000 });
    const firstItem = page
      .locator('#creator-editor-topic-container .item')
      .first();
    await firstItem.waitFor({ state: 'visible', timeout: 2000 });
    await firstItem.click();
  }

  protected async fillMeta(page: Page): Promise<void> {
    await this.fillTitle(page);
    await this.fillDesc(page);
    await this.fillTags(page);
  }

  protected async clickPublish(page: Page): Promise<void> {
    while (true) {
      try {
        if (this.publishStrategy === XIAOHONGSHU_PUBLISH_STRATEGY_SCHEDULED) {
          await page.locator('button:has-text("定时发布")').click();
        } else {
          await page.locator('button:has-text("发布")').click();
        }
        await page.waitForURL(XHS_PUBLISH_SUCCESS_URL_PATTERN, {
          timeout: 3000,
        });
        this.logger.log('发布成功');
        return;
      } catch {
        this.logger.debug('等待发布完成');
        if (this.debug) {
          await page.screenshot({ fullPage: true });
        }
        await sleep(500);
      }
    }
  }
}
