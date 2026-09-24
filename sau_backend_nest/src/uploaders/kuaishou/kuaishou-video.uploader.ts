import type { Page } from 'patchright';
import type { AuthService } from '../../modules/account/auth.service';
import type { AppConfig } from '../../config/app-config.interface';
import type { BrowserService } from '../../shared/browser/browser.service';
import { BaseUploader } from '../base/base-uploader';
import {
  attachWorkLinkSniffer,
  finishPublicWorkLink,
} from '../capture-work-link';
import type { WorkLink } from '../work-link';
import { KuaishouBaseUploader } from './kuaishou-base.uploader';
import {
  KUAISHOU_PUBLISH_STRATEGY_SCHEDULED,
  KUAISHOU_UPLOAD_URL,
  KUAISHOU_UPLOAD_URL_PATTERN,
} from './kuaishou.constants';

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export class KuaishouVideoUploader extends KuaishouBaseUploader {
  private filePath: string;
  private readonly title: string;
  private readonly tags: string[];
  private readonly desc: string;
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
      publishStrategy: opts.publishStrategy,
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
      throw new Error('快手视频上传时，title 是必须的');
    }
    this.filePath = BaseUploader.validateVideoFile(this.filePath);
    if (this.thumbnailPath) {
      this.thumbnailPath = BaseUploader.validateImageFile(this.thumbnailPath);
    }
  }

  private async setThumbnail(page: Page): Promise<void> {
    if (!this.thumbnailPath) {
      return;
    }
    this.logger.log('正在设置封面');
    const coverLabel = page.locator('span').filter({ hasText: '封面设置' });
    await coverLabel.waitFor({ state: 'visible', timeout: 30000 });
    await coverLabel
      .locator('xpath=../following-sibling::div[1]')
      .locator('div')
      .nth(0)
      .click();

    const modal = page.locator('div[role="document"].ant-modal');
    await modal.waitFor({ state: 'visible', timeout: 30000 });

    const uploadCoverTab = modal.getByText('上传封面', { exact: true });
    await uploadCoverTab.waitFor({ state: 'visible', timeout: 10000 });
    await uploadCoverTab.click();

    const fileInput = modal.locator('input[type="file"]');
    await fileInput.waitFor({ state: 'attached', timeout: 30000 });
    await fileInput.setInputFiles(this.thumbnailPath);
    await sleep(1000);

    const confirmButton = modal.getByRole('button', { name: '确认', exact: true });
    await confirmButton.waitFor({ state: 'visible', timeout: 10000 });
    await confirmButton.click();
    await modal.waitFor({ state: 'hidden', timeout: 30000 });
    this.logger.log('封面设置完成');
  }

  async upload(): Promise<WorkLink | null> {
    this.logger.log('检查 cookie、视频文件、封面和发布时间');
    await this.validateUploadArgs();
    this.logger.log('上传前检查通过');

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
    let workLink: WorkLink | null = null;
    const page = await context.newPage();
    this.workLinkSniffer = attachWorkLinkSniffer(page, 'kuaishou', this.logger);
    try {
      await page.goto(KUAISHOU_UPLOAD_URL);
      this.logger.log(`开始搬运视频: ${this.title}`);
      await page.waitForURL(KUAISHOU_UPLOAD_URL_PATTERN);

      const uploadButton = page.locator("button[class^='_upload-btn']");
      await uploadButton.waitFor({ state: 'visible', timeout: 10000 });
      const fileChooserPromise = page.waitForEvent('filechooser');
      await uploadButton.click();
      const fileChooser = await fileChooserPromise;
      await fileChooser.setFiles(this.filePath);
      await sleep(2000);

      await this.dismissKnowButton(page);
      await this.closeGuideOverlay(page);

      await this.fillDescriptionAndTags(
        page,
        this.desc || this.title,
        this.tags,
      );
      await this.waitForUploadComplete(page, this.filePath);
      await this.setThumbnail(page);

      if (
        this.publishStrategy === KUAISHOU_PUBLISH_STRATEGY_SCHEDULED &&
        this.publishDate !== 0
      ) {
        await this.setScheduleTime(page, this.publishDate);
      }

      await this.clickPublishAndConfirm(page);
      uploadSuccess = true;
      const scheduled =
        this.publishStrategy === KUAISHOU_PUBLISH_STRATEGY_SCHEDULED &&
        this.publishDate !== 0;
      if (!scheduled) {
        workLink = await finishPublicWorkLink(
          this.workLinkSniffer,
          page,
          this.logger,
          'kuaishou',
          this.accountFile,
          this.filePath,
        );
      }
    } finally {
      this.workLinkSniffer?.dispose();
      if (uploadSuccess) {
        await context.storageState({ path: this.accountFile });
        await sleep(2000);
      }
      await page.close().catch(() => undefined);
      await context.close().catch(() => undefined);
      await browser.close().catch(() => undefined);
    }
    return workLink;
  }
}
