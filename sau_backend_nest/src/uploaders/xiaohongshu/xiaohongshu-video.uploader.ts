import type { Page } from 'patchright';
import type { AuthService } from '../../modules/account/auth.service';
import type { AppConfig } from '../../config/app-config.interface';
import type { BrowserService } from '../../shared/browser/browser.service';
import { BaseUploader } from '../base/base-uploader';
import { XiaohongshuBaseUploader } from './xiaohongshu-base.uploader';
import {
  XHS_PUBLISH_VIDEO_URL,
  XIAOHONGSHU_PUBLISH_STRATEGY_IMMEDIATE,
  XIAOHONGSHU_PUBLISH_STRATEGY_SCHEDULED,
} from './xiaohongshu.constants';

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export class XiaohongshuVideoUploader extends XiaohongshuBaseUploader {
  private filePath: string;
  private thumbnailPath?: string;

  constructor(
    browserService: BrowserService,
    authService: AuthService,
    appConfig: AppConfig,
    opts: {
      title: string;
      filePath: string;
      tags?: string[];
      publishDate: Date | 0;
      accountFile: string;
      thumbnailPath?: string;
      desc?: string;
      publishStrategy?: string;
      browserPublish?: boolean;
    },
  ) {
    super(browserService, authService, appConfig, {
      publishDate: opts.publishDate,
      accountFile: opts.accountFile,
      publishStrategy:
        opts.publishStrategy ??
        (opts.publishDate !== 0
          ? XIAOHONGSHU_PUBLISH_STRATEGY_SCHEDULED
          : XIAOHONGSHU_PUBLISH_STRATEGY_IMMEDIATE),
      browserPublish: opts.browserPublish,
    });
    this.title = opts.title;
    this.filePath = opts.filePath;
    this.tags = opts.tags ?? [];
    this.desc = opts.desc ?? '';
    this.thumbnailPath = opts.thumbnailPath;
  }

  private async validateUploadArgs(): Promise<void> {
    await this.validateBaseArgs();
    if (!this.title?.trim()) {
      throw new Error('视频模式下，title 是必须的');
    }
    this.filePath = BaseUploader.validateVideoFile(this.filePath);
    if (this.thumbnailPath) {
      this.thumbnailPath = BaseUploader.validateImageFile(this.thumbnailPath);
    }
  }

  private async waitForVideoUpload(page: Page): Promise<void> {
    while (true) {
      try {
        const uploadInput = await page.waitForSelector('input.upload-input', {
          timeout: 3000,
        });
        const previewNew = await uploadInput.evaluateHandle((el) => {
          let sibling = el.nextElementSibling;
          while (sibling) {
            if (sibling.classList.contains('preview-new')) {
              return sibling;
            }
            sibling = sibling.nextElementSibling;
          }
          return null;
        });
        const previewEl = previewNew.asElement();
        if (previewEl) {
          const stages = await previewEl.$$('div.stage');
          for (const stage of stages) {
            const text = (await stage.textContent()) ?? '';
            if (text.includes('上传成功') || text.includes('分辨率')) {
              this.logger.log('视频上传完成');
              return;
            }
          }
        }
      } catch {
        // continue polling
      }
      await sleep(2000);
    }
  }

  private async setThumbnail(page: Page): Promise<void> {
    if (!this.thumbnailPath) {
      return;
    }
    this.logger.log('正在设置封面');
    const coverPluginTitle = page
      .locator('div.cover-plugin-title')
      .filter({ hasText: '设置封面' });
    const coverUploadDialog = coverPluginTitle
      .locator(
        "xpath=ancestor::div[contains(@class, 'cover-plugin-preview')]",
      )
      .locator('div.cover > div.default:visible');
    await coverUploadDialog.waitFor({ state: 'visible', timeout: 30000 });
    await coverUploadDialog.click({ force: true });

    const modal = page.locator('div.d-modal.cover-modal');
    await modal.waitFor({ state: 'visible', timeout: 30000 });

    const fileInput = modal
      .locator('input[type="file"][accept*="image"]')
      .first();
    await fileInput.waitFor({ state: 'attached', timeout: 10000 });
    await fileInput.setInputFiles(this.thumbnailPath);
    await page.waitForTimeout(2000);

    const confirmButton = modal
      .locator('button.mojito-button')
      .filter({ hasText: '确定' })
      .first();
    await confirmButton.waitFor({ state: 'visible', timeout: 10000 });
    await confirmButton.click();
    await modal.waitFor({ state: 'hidden', timeout: 30000 });
    this.logger.log('封面设置完成');
  }

  private async uploadVideoContent(page: Page): Promise<void> {
    this.logger.log(`开始搬运视频: ${this.title}`);
    await page.goto(XHS_PUBLISH_VIDEO_URL);
    await page.waitForURL(XHS_PUBLISH_VIDEO_URL);
    await page
      .locator("div[class^='upload-content'] input.upload-input")
      .setInputFiles(this.filePath);

    await this.waitForVideoUpload(page);
    this.logger.log('开始填写标题、描述和话题');
    await this.fillMeta(page);
    await this.setThumbnail(page);

    if (
      this.publishStrategy === XIAOHONGSHU_PUBLISH_STRATEGY_SCHEDULED &&
      this.publishDate !== 0
    ) {
      await this.setScheduleTime(page, this.publishDate);
    }

    await this.clickPublish(page);
  }

  async upload(): Promise<void> {
    this.logger.log('检查 cookie、视频文件、封面和发布时间');
    await this.validateUploadArgs();
    this.logger.log('上传前检查通过');

    const headless = this.resolveHeadless();
    const browser = await this.browserService.launchPatchright({
      lang: 'en-GB',
      headless,
    });
    const context = await browser.newContext({
      permissions: ['geolocation'],
      storageState: this.accountFile,
    });
    await this.browserService.addStealthScript(context);

    const page = await context.newPage();
    try {
      await this.uploadVideoContent(page);
      await context.storageState({ path: this.accountFile });
      await sleep(2000);
    } finally {
      await page.close().catch(() => undefined);
      await context.close().catch(() => undefined);
      await browser.close().catch(() => undefined);
    }
  }
}
