import type { Page } from 'patchright';
import type { AuthService } from '../../modules/account/auth.service';
import type { AppConfig } from '../../config/app-config.interface';
import type { BrowserService } from '../../shared/browser/browser.service';
import { BaseUploader } from '../base/base-uploader';
import { KuaishouBaseUploader } from './kuaishou-base.uploader';
import {
  KUAISHOU_PUBLISH_STRATEGY_SCHEDULED,
  KUAISHOU_UPLOAD_URL,
  KUAISHOU_UPLOAD_URL_PATTERN,
} from './kuaishou.constants';

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export class KuaishouNoteUploader extends KuaishouBaseUploader {
  private imagePaths: string[];
  private readonly note: string;
  private readonly title: string;
  private readonly tags: string[];

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
    this.note = opts.note ?? '';
    this.title = opts.title ?? (this.note.slice(0, 20) || '');
    this.tags = opts.tags ?? [];
  }

  private async validateUploadArgs(): Promise<void> {
    await this.validateBaseArgs();
    if (!this.title?.trim()) {
      throw new Error('快手图文上传时，title 是必须的');
    }
    if (!this.imagePaths?.length) {
      throw new Error('快手图文上传时，图片是必须的');
    }
    this.imagePaths = this.imagePaths.map((p) =>
      BaseUploader.validateImageFile(p),
    );
  }

  private async uploadNoteContent(page: Page): Promise<void> {
    this.logger.log(`开始搬运图文，共 ${this.imagePaths.length} 张图片`);
    await page
      .locator('div[role="tablist"] div[role="tab"]:has-text("图文")')
      .click();
    await page.waitForTimeout(1000);

    const uploadButton = page
      .locator("button[class^='_upload-btn']")
      .filter({ hasText: '上传图片' });
    await uploadButton.waitFor({ state: 'visible', timeout: 10000 });
    const fileChooserPromise = page.waitForEvent('filechooser');
    await uploadButton.click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(this.imagePaths);

    await this.dismissKnowButton(page);
    await this.closeGuideOverlay(page);

    await this.fillDescriptionAndTags(page, this.note, this.tags);
    await this.waitForUploadComplete(page, this.imagePaths);

    if (
      this.publishStrategy === KUAISHOU_PUBLISH_STRATEGY_SCHEDULED &&
      this.publishDate !== 0
    ) {
      await this.setScheduleTime(page, this.publishDate);
    }

    await this.clickPublishAndConfirm(page);
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
      storageState: this.accountFile,
    });
    await this.browserService.addStealthScript(context);

    let uploadSuccess = false;
    const page = await context.newPage();
    try {
      await page.goto(KUAISHOU_UPLOAD_URL);
      this.logger.log('正在打开快手图文发布页');
      await page.waitForURL(KUAISHOU_UPLOAD_URL_PATTERN);
      await this.uploadNoteContent(page);
      uploadSuccess = true;
    } finally {
      if (uploadSuccess) {
        await context.storageState({ path: this.accountFile });
        await sleep(2000);
      }
      await page.close().catch(() => undefined);
      await context.close().catch(() => undefined);
      await browser.close().catch(() => undefined);
    }
  }
}
