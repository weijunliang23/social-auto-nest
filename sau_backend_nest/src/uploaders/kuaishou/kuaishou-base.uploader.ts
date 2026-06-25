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
  KUAISHOU_MANAGE_URL_PATTERN,
  KUAISHOU_PUBLISH_STRATEGY_IMMEDIATE,
  KUAISHOU_PUBLISH_STRATEGY_SCHEDULED,
} from './kuaishou.constants';

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export abstract class KuaishouBaseUploader extends BaseUploader {
  protected readonly logger = new Logger(this.constructor.name);
  protected publishDate: Date | 0;
  protected readonly accountFile: string;
  protected readonly publishStrategy: string;
  protected readonly debug: boolean;
  protected readonly browserPublish: boolean;

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
      opts.publishStrategy ??
      (opts.publishDate !== 0
        ? KUAISHOU_PUBLISH_STRATEGY_SCHEDULED
        : KUAISHOU_PUBLISH_STRATEGY_IMMEDIATE);
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
        `cookie文件不存在，请先完成快手登录: ${this.accountFile}`,
      );
    }
    const { ownerId, filePath } = parseCookieStoragePath(this.accountFile);
    const valid = await this.authService.checkCookie(
      MEDIA_TYPE.KUAISHOU,
      filePath,
      { ownerId },
    );
    if (!valid) {
      throw new Error(
        `cookie文件已失效，请先完成快手登录: ${this.accountFile}`,
      );
    }
    if (
      this.publishStrategy !== KUAISHOU_PUBLISH_STRATEGY_IMMEDIATE &&
      this.publishStrategy !== KUAISHOU_PUBLISH_STRATEGY_SCHEDULED
    ) {
      throw new Error(`不支持的发布策略: ${this.publishStrategy}`);
    }
    if (this.publishStrategy === KUAISHOU_PUBLISH_STRATEGY_SCHEDULED) {
      this.publishDate = BaseUploader.validatePublishDate(this.publishDate);
    } else {
      this.publishDate = 0;
    }
  }

  protected async setScheduleTime(
    page: Page,
    publishDate: Date,
  ): Promise<void> {
    this.logger.log('设置定时发布时间');
    const publishDateHour = `${publishDate.getFullYear()}-${String(publishDate.getMonth() + 1).padStart(2, '0')}-${String(publishDate.getDate()).padStart(2, '0')} ${String(publishDate.getHours()).padStart(2, '0')}:${String(publishDate.getMinutes()).padStart(2, '0')}:${String(publishDate.getSeconds()).padStart(2, '0')}`;
    await page
      .locator("label:text('发布时间')")
      .locator('xpath=following-sibling::div')
      .locator('.ant-radio-input')
      .nth(1)
      .click();
    await sleep(1000);
    await page
      .locator('div.ant-picker-input input[placeholder="选择日期时间"]')
      .click();
    await sleep(1000);
    await page.keyboard.press('Control+KeyA');
    await page.keyboard.type(publishDateHour);
    await page.keyboard.press('Enter');
    await sleep(1000);
  }

  protected async closeGuideOverlay(page: Page): Promise<void> {
    const joyrideTooltip = page.locator(
      'div[id^="react-joyride-step"] div[role="alertdialog"]',
    );
    if (
      (await joyrideTooltip.count()) > 0 &&
      (await joyrideTooltip.first().isVisible())
    ) {
      this.logger.log('检测到 Joyride 引导遮罩，正在关闭');
      const closeButton = page
        .locator('div[role="alertdialog"]')
        .locator(
          '[aria-label="Skip"], [data-action="skip"], button[title="Skip"]',
        );
      await closeButton.click({ force: true });
      await joyrideTooltip.first().waitFor({ state: 'hidden', timeout: 5000 });
    }
  }

  protected async dismissKnowButton(page: Page): Promise<void> {
    const knowButton = page
      .locator('button[type="button"] span:text("我知道了")')
      .first();
    try {
      if ((await knowButton.count()) && (await knowButton.isVisible())) {
        await knowButton.click();
      }
    } catch {
      // ignore
    }
  }

  protected async fillDescriptionAndTags(
    page: Page,
    text: string,
    tags?: string[],
  ): Promise<void> {
    await page.getByText('描述').locator('xpath=following-sibling::div').click();
    await page.keyboard.press('Backspace');
    await page.keyboard.press('Control+KeyA');
    await page.keyboard.press('Delete');
    await page.keyboard.type(text);
    await page.keyboard.press('Enter');

    for (const tag of (tags ?? []).slice(0, 3)) {
      this.logger.log(`添加话题: #${tag}`);
      await page.keyboard.type(`#${tag} `);
      await sleep(2000);
    }
  }

  protected async waitForUploadComplete(
    page: Page,
    retryFiles: string | string[],
  ): Promise<void> {
    const maxRetries = 60;
    for (let retryCount = 0; retryCount < maxRetries; retryCount++) {
      try {
        const uploading = await page.locator('text=上传中').count();
        if (uploading === 0) {
          this.logger.log('素材上传完成');
          return;
        }
        if (retryCount % 5 === 0) {
          this.logger.log('正在上传素材');
        }
        if ((await page.locator('text=上传失败').count()) > 0) {
          this.logger.warn('上传失败，准备重新上传');
          await page
            .locator('div.progress-div [class^="upload-btn-input"]')
            .setInputFiles(retryFiles);
        }
        await sleep(2000);
      } catch (e) {
        this.logger.warn(
          `检查上传状态时出错: ${e instanceof Error ? e.message : String(e)}`,
        );
        await sleep(2000);
      }
    }
    this.logger.warn('超过最大重试次数，上传可能未完成');
  }

  protected async clickPublishAndConfirm(page: Page): Promise<void> {
    while (true) {
      try {
        const publishButton = page.getByText('发布', { exact: true });
        if ((await publishButton.count()) > 0) {
          await publishButton.click();
        }
        await sleep(1000);
        const confirmButton = page.getByText('确认发布');
        if ((await confirmButton.count()) > 0) {
          await confirmButton.click();
        }
        await page.waitForURL(KUAISHOU_MANAGE_URL_PATTERN, { timeout: 5000 });
        this.logger.log('发布成功');
        return;
      } catch (e) {
        this.logger.debug(
          `等待发布完成: ${e instanceof Error ? e.message : String(e)}`,
        );
        if (this.debug) {
          await page.screenshot({ fullPage: true });
        }
        await sleep(1000);
      }
    }
  }
}
