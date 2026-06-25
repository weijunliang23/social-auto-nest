import { basename } from 'path';
import type { Page } from 'patchright';
import type { AuthService } from '../../modules/account/auth.service';
import type { AppConfig } from '../../config/app-config.interface';
import type { BrowserService } from '../../shared/browser/browser.service';
import { BaseUploader } from '../base/base-uploader';
import { DouyinBaseUploader } from './douyin-base.uploader';
import {
  DOUYIN_PUBLISH_STRATEGY_IMMEDIATE,
  DOUYIN_PUBLISH_STRATEGY_SCHEDULED,
} from './douyin.constants';

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
const WAIT_URL_TIMEOUT_MS = 3000;
const WAIT_MAX_ATTEMPTS = 100;

export class DouyinNoteUploader extends DouyinBaseUploader {
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
      publishStrategy: opts.publishStrategy ?? DOUYIN_PUBLISH_STRATEGY_IMMEDIATE,
      browserPublish: opts.browserPublish,
    });
    this.imagePaths = opts.imagePaths;
    this.note = opts.note ?? '';
    this.title = opts.title ?? (this.note.slice(0, 30) || '');
    this.tags = opts.tags ?? [];
  }

  private async validateUploadArgs(): Promise<void> {
    await this.validateBaseArgs();
    if (!this.title?.trim()) {
      throw new Error('图文模式下，title 是必须的');
    }
    if (!this.imagePaths?.length) {
      throw new Error('图文模式下，图片是必须的');
    }
    if (this.imagePaths.length > 35) {
      throw new Error('图文模式下最多只支持上传 35 张图片');
    }
    this.imagePaths = this.imagePaths.map((p) =>
      BaseUploader.validateImageFile(p),
    );
  }

  private async waitForUrlWithProgress(
    page: Page,
    urlPattern: string,
    progressLabel: string,
    timeoutError: string,
  ): Promise<void> {
    for (let attempt = 1; attempt <= WAIT_MAX_ATTEMPTS; attempt++) {
      try {
        await page.waitForURL(urlPattern, { timeout: WAIT_URL_TIMEOUT_MS });
        return;
      } catch {
        if (attempt % 10 === 0) {
          this.logger.log(
            `${progressLabel}，第 ${attempt} 次，当前 URL=${page.url()}`,
          );
        }
        await sleep(500);
      }
    }
    throw new Error(`${timeoutError}，最后 URL=${page.url()}`);
  }

  private async uploadNoteContent(page: Page): Promise<void> {
    this.logger.log(`开始搬运图文，共 ${this.imagePaths.length} 张图片`);

    this.logger.log('切换到图文发布');
    await page.getByText('发布图文', { exact: true }).click();
    await page.waitForTimeout(1000);

    const imageNames = this.imagePaths.map((p) => basename(p)).join(', ');
    this.logger.log(
      `正在上传 ${this.imagePaths.length} 张图片: ${imageNames}`,
    );
    await page
      .locator("div[class^='container'] input[accept*='image']")
      .setInputFiles(this.imagePaths);

    await this.waitForUrlWithProgress(
      page,
      '**/creator-micro/content/post/image?**',
      '等待进入图文编辑页',
      '等待进入图文编辑页超时',
    );
    this.logger.log('已进入图文发布页面');

    await sleep(1000);
    this.logger.log('开始填写标题、描述和话题');
    await this.fillTitleAndDescription(
      page,
      this.title,
      this.note,
      this.tags,
    );
    this.logger.log(`已填写 ${this.tags.length} 个话题`);

    if (
      this.publishStrategy === DOUYIN_PUBLISH_STRATEGY_SCHEDULED &&
      this.publishDate !== 0
    ) {
      this.logger.log(`设置定时发布: ${this.publishDate.toISOString()}`);
      await this.setScheduleTimeDouyin(page, this.publishDate);
    }

    for (let attempt = 1; attempt <= WAIT_MAX_ATTEMPTS; attempt++) {
      try {
        const publishButton = page.getByRole('button', {
          name: '发布',
          exact: true,
        });
        if (await publishButton.count()) {
          await publishButton.click();
        }
        await page.waitForURL(
          '**/creator-micro/content/manage?enter_from=publish**',
          { timeout: WAIT_URL_TIMEOUT_MS },
        );
        this.logger.log('图文发布成功');
        return;
      } catch {
        if (attempt % 10 === 0) {
          this.logger.log(
            `等待发布完成，第 ${attempt} 次，当前 URL=${page.url()}`,
          );
        }
        await sleep(500);
      }
    }
    throw new Error(`等待发布完成超时，最后 URL=${page.url()}`);
  }

  async upload(): Promise<void> {
    this.logger.log('检查 cookie、图片和发布时间');
    await this.validateUploadArgs();
    this.logger.log('图文上传前检查通过');

    const headless = this.resolveHeadless();
    this.logger.log(`启动浏览器 headless=${headless}`);
    const browser = await this.browserService.launchPatchright({
      antiDetect: true,
      headless,
    });
    const context = await browser.newContext({
      storageState: this.accountFile,
      permissions: ['geolocation'],
    });
    await this.browserService.addStealthScript(context);

    let uploadSuccess = false;
    const page = await context.newPage();
    try {
      this.logger.log('正在打开抖音上传页');
      await page.goto(
        'https://creator.douyin.com/creator-micro/content/upload',
      );
      await page.waitForURL(
        'https://creator.douyin.com/creator-micro/content/upload',
      );
      this.logger.log(`上传页加载完成，当前 URL=${page.url()}`);
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
