import type { Page } from 'patchright';
import type { AuthService } from '../../modules/account/auth.service';
import type { AppConfig } from '../../config/app-config.interface';
import type { BrowserService } from '../../shared/browser/browser.service';
import { BaseUploader } from '../base/base-uploader';
import { XiaohongshuBaseUploader } from './xiaohongshu-base.uploader';
import {
  XHS_PUBLISH_NOTE_URL,
  XIAOHONGSHU_PUBLISH_STRATEGY_SCHEDULED,
} from './xiaohongshu.constants';

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export class XiaohongshuNoteUploader extends XiaohongshuBaseUploader {
  private imagePaths: string[];

  constructor(
    browserService: BrowserService,
    authService: AuthService,
    appConfig: AppConfig,
    opts: {
      imagePaths: string[];
      note: string;
      tags?: string[];
      publishDate: Date | 0;
      accountFile: string;
      title?: string;
      publishStrategy?: string;
      browserPublish?: boolean;
    },
  ) {
    super(browserService, authService, appConfig, {
      publishDate: opts.publishDate,
      accountFile: opts.accountFile,
      publishStrategy: opts.publishStrategy,
      browserPublish: opts.browserPublish,
    });
    this.imagePaths = opts.imagePaths;
    const note = opts.note ?? '';
    this.desc = note;
    this.title =
      opts.title ?? (note.slice(0, 20) || '');
    this.tags = opts.tags ?? [];
  }

  private async validateUploadArgs(): Promise<void> {
    await this.validateBaseArgs();
    if (!this.imagePaths?.length) {
      throw new Error('图文模式下，图片是必须的');
    }
    if (!this.title?.trim()) {
      throw new Error('图文模式下，title 是必须的');
    }
    this.imagePaths = this.imagePaths.map((p) =>
      BaseUploader.validateImageFile(p),
    );
  }

  private async uploadNoteContent(page: Page): Promise<void> {
    this.logger.log(`开始搬运图文，共 ${this.imagePaths.length} 张图片`);
    await page.goto(XHS_PUBLISH_NOTE_URL);
    await page.waitForURL(XHS_PUBLISH_NOTE_URL);

    let uploadInput = page
      .locator('input[type="file"][accept*="image"]')
      .first();
    if ((await uploadInput.count()) === 0) {
      uploadInput = page
        .locator("div[class^='upload-content'] input.upload-input")
        .first();
    }
    await uploadInput.waitFor({ state: 'attached', timeout: 30000 });
    this.logger.log('正在上传图片');
    await uploadInput.setInputFiles(this.imagePaths);

    while (true) {
      try {
        const titleContainer = page
          .locator('input[placeholder*="填写标题"]')
          .first();
        await titleContainer.waitFor({ state: 'visible', timeout: 3000 });
        this.logger.log('图文素材上传完成');
        break;
      } catch {
        await sleep(1000);
      }
    }

    this.logger.log('开始填写标题、描述和话题');
    await this.fillMeta(page);

    if (
      this.publishStrategy === XIAOHONGSHU_PUBLISH_STRATEGY_SCHEDULED &&
      this.publishDate !== 0
    ) {
      await this.setScheduleTime(page, this.publishDate);
    }

    await this.clickPublish(page);
  }

  async upload(): Promise<void> {
    this.logger.log('检查 cookie、图片和发布时间');
    await this.validateUploadArgs();
    this.logger.log('图文上传前检查通过');

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
      await this.uploadNoteContent(page);
      await context.storageState({ path: this.accountFile });
      await sleep(2000);
    } finally {
      await page.close().catch(() => undefined);
      await context.close().catch(() => undefined);
      await browser.close().catch(() => undefined);
    }
  }
}
