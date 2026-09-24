import { basename } from 'path';
import type { AuthService } from '../../modules/account/auth.service';
import type { AppConfig } from '../../config/app-config.interface';
import type { BrowserService } from '../../shared/browser/browser.service';
import { BaseUploader } from '../base/base-uploader';
import type { WorkLink } from '../work-link';
import { TencentBaseUploader } from './tencent-base.uploader';
import { TENCENT_POST_LIST_URL } from './tencent.constants';

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export class TencentVideoUploader extends TencentBaseUploader {
  private filePath: string;
  private readonly title: string;
  private readonly tags: string[];
  private readonly category: string | null;
  private readonly isDraft: boolean;

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
      category?: string | null;
      isDraft?: boolean;
      browserPublish?: boolean;
    },
  ) {
    super(browserService, authService, appConfig, {
      publishDate: opts.publishDate,
      accountFile: opts.accountFile,
      browserPublish: opts.browserPublish,
    });
    this.title = opts.title;
    this.filePath = opts.filePath;
    this.tags = opts.tags ?? [];
    this.category = opts.category ?? null;
    this.isDraft = opts.isDraft ?? false;
  }

  private async validateUploadArgs(): Promise<void> {
    await this.validateBaseArgs();
    if (!this.title?.trim()) {
      throw new Error('视频号视频上传时，title 是必须的');
    }
    this.filePath = BaseUploader.validateVideoFile(this.filePath);
  }

  async upload(): Promise<WorkLink | null> {
    this.logger.log('检查 cookie、视频文件和发布时间');
    await this.validateUploadArgs();
    this.logger.log('上传前检查通过');

    const headless = this.resolveHeadless();
    const browser = await this.browserService.launchPlaywright({
      lang: 'en-GB',
      headless,
    });
    const context = await browser.newContext({
      storageState: this.accountFile,
      viewport: { width: 1280, height: 900 },
    });
    await this.browserService.addStealthScript(context);

    let uploadSuccess = false;
    let workLink: WorkLink | null = null;
    const page = await context.newPage();
    page.setDefaultTimeout(60000);
    try {
      await this.ensurePublishPageReady(page);
      this.logger.log(`正在上传: ${this.title}`);

      await this.uploadVideoFile(page, this.filePath);
      await this.addTitleTags(page, this.title, this.tags);
      await this.addCollection(page);
      await this.addOriginal(page, this.category);
      await this.detectUploadStatus(page, this.filePath);

      if (this.publishDate !== 0) {
        await this.setScheduleTimeTencent(page, this.publishDate);
      }
      await this.addShortTitle(page, this.title);
      await this.clickPublish(page, this.isDraft);
      uploadSuccess = true;
      if (!this.isDraft) {
        workLink = {
          account: basename(this.accountFile),
          file: basename(this.filePath),
          url: TENCENT_POST_LIST_URL,
          kind: 'creator',
        };
      }
    } finally {
      if (uploadSuccess) {
        await context.storageState({ path: this.accountFile });
        this.logger.log('cookie更新完毕');
        await sleep(2000);
      }
      await page.close().catch(() => undefined);
      await context.close().catch(() => undefined);
      await browser.close().catch(() => undefined);
    }
    return workLink;
  }
}
