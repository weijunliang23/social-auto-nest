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

export class DouyinVideoUploader extends DouyinBaseUploader {
  private filePath: string;
  private thumbnailLandscapePath?: string;
  private thumbnailPortraitPath?: string;

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
      thumbnailLandscapePath?: string;
      thumbnailPortraitPath?: string;
      productLink?: string;
      productTitle?: string;
      desc?: string;
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
    this.title = opts.title;
    this.filePath = opts.filePath;
    this.tags = opts.tags ?? [];
    this.thumbnailLandscapePath = opts.thumbnailLandscapePath;
    this.thumbnailPortraitPath = opts.thumbnailPortraitPath;
    this.productLink = opts.productLink ?? '';
    this.productTitle = opts.productTitle ?? '';
    this.desc = opts.desc ?? '';
  }

  private readonly title: string;
  private readonly tags: string[];
  private readonly productLink: string;
  private readonly productTitle: string;
  private readonly desc: string;

  private async validateUploadArgs(): Promise<void> {
    await this.validateBaseArgs();
    if (!this.title?.trim()) {
      throw new Error('视频模式下，title 是必须的');
    }
    this.filePath = BaseUploader.validateVideoFile(this.filePath);
    if (this.thumbnailLandscapePath) {
      this.thumbnailLandscapePath = BaseUploader.validateImageFile(
        this.thumbnailLandscapePath,
      );
    }
    if (this.thumbnailPortraitPath) {
      this.thumbnailPortraitPath = BaseUploader.validateImageFile(
        this.thumbnailPortraitPath,
      );
    }
  }

  private async handleUploadError(page: Page): Promise<void> {
    this.logger.warn('视频上传失败，准备重新上传');
    await page
      .locator('div.progress-div [class^="upload-btn-input"]')
      .setInputFiles(this.filePath);
  }

  private async handleAutoVideoCover(page: Page): Promise<boolean> {
    if (await page.getByText('请设置封面后再发布').first().isVisible()) {
      const recommendCover = page.locator('[class^="recommendCover-"]').first();
      if (await recommendCover.count()) {
        try {
          await recommendCover.click();
          await sleep(1000);
          const confirmText = '是否确认应用此封面？';
          if (await page.getByText(confirmText).first().isVisible()) {
            await page.getByRole('button', { name: '确定' }).click();
            await sleep(1000);
          }
          return true;
        } catch (e) {
          this.logger.warn(
            `推荐封面没选成功: ${e instanceof Error ? e.message : String(e)}`,
          );
        }
      }
    }
    return false;
  }

  private async setThumbnail(page: Page): Promise<void> {
    if (!this.thumbnailLandscapePath && !this.thumbnailPortraitPath) {
      return;
    }

    this.logger.log('正在设置视频封面');
    await page.click('text="选择封面"');
    const coverLocatorStr = 'div[id*="creator-content-modal"]';
    const coverLocator = page.locator(coverLocatorStr);
    await page.waitForSelector(coverLocatorStr);

    const uploadInput = coverLocator.locator(
      "div[class^='semi-upload upload'] >> input.semi-upload-hidden-input",
    );

    if (this.thumbnailLandscapePath) {
      await page.waitForTimeout(1000);
      await uploadInput.setInputFiles(this.thumbnailLandscapePath);
      await page.waitForTimeout(2000);
    }

    if (this.thumbnailPortraitPath) {
      await coverLocator.locator("div[class*='steps'] div").nth(1).click();
      await page.waitForTimeout(1000);
      await uploadInput.setInputFiles(this.thumbnailPortraitPath);
      await page.waitForTimeout(2000);
    }

    await coverLocator.locator('button:visible:has-text("完成")').click();
    await page.waitForSelector('div.extractFooter', { state: 'detached' });
  }

  async upload(): Promise<void> {
    this.logger.log('检查 cookie、视频文件、封面和发布时间');
    await this.validateUploadArgs();
    this.logger.log('上传前检查通过');

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

    const page = await context.newPage();
    try {
      await page.goto(
        'https://creator.douyin.com/creator-micro/content/upload',
      );
      this.logger.log(`开始搬运视频: ${this.title}`);
      await page.waitForURL(
        'https://creator.douyin.com/creator-micro/content/upload',
      );
      await page
        .locator("div[class^='container'] input")
        .setInputFiles(this.filePath);

      while (true) {
        try {
          await page.waitForURL(
            'https://creator.douyin.com/creator-micro/content/publish?enter_from=publish_page',
            { timeout: 3000 },
          );
          break;
        } catch {
          try {
            await page.waitForURL(
              'https://creator.douyin.com/creator-micro/content/post/video?enter_from=publish_page',
              { timeout: 3000 },
            );
            break;
          } catch {
            await sleep(500);
          }
        }
      }

      await sleep(1000);
      await this.fillTitleAndDescription(
        page,
        this.title,
        this.desc || this.title,
        this.tags,
      );

      while (true) {
        try {
          const number = await page
            .locator('[class^="long-card"] div:has-text("重新上传")')
            .count();
          if (number > 0) {
            break;
          }
          await sleep(2000);
          if (
            (await page
              .locator('div.progress-div > div:has-text("上传失败")')
              .count()) > 0
          ) {
            await this.handleUploadError(page);
          }
        } catch {
          await sleep(2000);
        }
      }

      if (this.productLink && this.productTitle) {
        await this.setProductLink(
          page,
          this.productLink,
          this.productTitle,
        );
      }

      await this.setThumbnail(page);

      const thirdPartElement =
        '[class^="info"] > [class^="first-part"] div div.semi-switch';
      const switchEl = page.locator(thirdPartElement).first();
      if ((await switchEl.count()) > 0) {
        const className = (await switchEl.getAttribute('class')) ?? '';
        if (!className.includes('semi-switch-checked')) {
          await switchEl.locator('input.semi-switch-native-control').click();
        }
      }

      if (
        this.publishStrategy === DOUYIN_PUBLISH_STRATEGY_SCHEDULED &&
        this.publishDate !== 0
      ) {
        await this.setScheduleTimeDouyin(page, this.publishDate);
      }

      while (true) {
        try {
          const publishButton = page.getByRole('button', {
            name: '发布',
            exact: true,
          });
          if (await publishButton.count()) {
            await publishButton.click();
          }
          await page.waitForURL(
            'https://creator.douyin.com/creator-micro/content/manage**',
            { timeout: 3000 },
          );
          this.logger.log('视频发布成功');
          break;
        } catch {
          await this.handleAutoVideoCover(page);
          if (this.debug) {
            await page.screenshot({ fullPage: true });
          }
          await sleep(500);
        }
      }

      await context.storageState({ path: this.accountFile });
      await sleep(2000);
    } finally {
      await page.close().catch(() => undefined);
      await context.close().catch(() => undefined);
      await browser.close().catch(() => undefined);
    }
  }
}
