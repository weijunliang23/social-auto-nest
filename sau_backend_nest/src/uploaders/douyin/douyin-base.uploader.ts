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
import type { WorkLinkSniffer } from '../capture-work-link';
import {
  DOUYIN_PUBLISH_STRATEGY_IMMEDIATE,
  DOUYIN_PUBLISH_STRATEGY_SCHEDULED,
} from './douyin.constants';

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export abstract class DouyinBaseUploader extends BaseUploader {
  protected readonly logger = new Logger(this.constructor.name);
  protected publishDate: Date | 0;
  protected readonly accountFile: string;
  protected readonly publishStrategy: string;
  protected readonly debug: boolean;
  protected readonly browserPublish: boolean;
  protected workLinkSniffer?: WorkLinkSniffer;

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
      opts.publishStrategy ?? DOUYIN_PUBLISH_STRATEGY_IMMEDIATE;
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
        `cookie文件不存在，请先完成抖音登录: ${this.accountFile}`,
      );
    }
    const { ownerId, filePath } = parseCookieStoragePath(this.accountFile);
    const valid = await this.authService.checkCookie(
      MEDIA_TYPE.DOUYIN,
      filePath,
      { ownerId },
    );
    if (!valid) {
      throw new Error(
        `cookie文件已失效，请先完成抖音登录: ${this.accountFile}`,
      );
    }
    if (
      this.publishStrategy !== DOUYIN_PUBLISH_STRATEGY_IMMEDIATE &&
      this.publishStrategy !== DOUYIN_PUBLISH_STRATEGY_SCHEDULED
    ) {
      throw new Error(`不支持的发布策略: ${this.publishStrategy}`);
    }
    if (this.publishStrategy === DOUYIN_PUBLISH_STRATEGY_SCHEDULED) {
      this.publishDate = BaseUploader.validatePublishDate(this.publishDate);
    } else {
      this.publishDate = 0;
    }
  }

  protected async setScheduleTimeDouyin(
    page: Page,
    publishDate: Date,
  ): Promise<void> {
    const labelElement = page.locator("[class^='radio']:has-text('定时发布')");
    await labelElement.click();
    await sleep(1000);
    const publishDateHour = `${publishDate.getFullYear()}-${String(publishDate.getMonth() + 1).padStart(2, '0')}-${String(publishDate.getDate()).padStart(2, '0')} ${String(publishDate.getHours()).padStart(2, '0')}:${String(publishDate.getMinutes()).padStart(2, '0')}`;

    await sleep(1000);
    await page.locator('.semi-input[placeholder="日期和时间"]').click();
    await page.keyboard.press('Control+KeyA');
    await page.keyboard.type(publishDateHour);
    await page.keyboard.press('Enter');
    await sleep(1000);
  }

  protected async fillTitleAndDescription(
    page: Page,
    title: string,
    description: string,
    tags?: string[],
  ): Promise<void> {
    const descriptionSection = page
      .getByText('作品描述', { exact: true })
      .locator('xpath=ancestor::div[2]')
      .locator('xpath=following-sibling::div[1]');

    const titleInput = descriptionSection.locator('input[type="text"]').first();
    await titleInput.waitFor({ state: 'visible', timeout: 10000 });
    await titleInput.fill(title.slice(0, 30));

    const descriptionEditor = descriptionSection
      .locator('.zone-container[contenteditable="true"]')
      .first();
    await descriptionEditor.waitFor({ state: 'visible', timeout: 10000 });
    await descriptionEditor.click();
    await page.keyboard.press('Control+KeyA');
    await page.keyboard.press('Delete');
    await page.keyboard.type(description);

    for (const tag of tags ?? []) {
      await page.keyboard.type(` #${tag}`);
      await page.keyboard.press('Space');
    }
  }

  protected async handleProductDialog(
    page: Page,
    productTitle: string,
  ): Promise<boolean> {
    await page.waitForTimeout(2000);
    await page.waitForSelector('input[placeholder="请输入商品短标题"]', {
      timeout: 10000,
    });
    const shortTitleInput = page.locator(
      'input[placeholder="请输入商品短标题"]',
    );
    if ((await shortTitleInput.count()) === 0) {
      this.logger.error('没找到商品短标题输入框');
      return false;
    }

    const trimmedTitle = productTitle.slice(0, 10);
    await shortTitleInput.fill(trimmedTitle);
    await page.waitForTimeout(1000);

    const finishButton = page.locator('button:has-text("完成编辑")');
    const buttonClass = (await finishButton.getAttribute('class')) ?? '';
    if (!buttonClass.includes('disabled')) {
      await finishButton.click();
      await page.waitForSelector('.semi-modal-content', {
        state: 'hidden',
        timeout: 5000,
      });
      return true;
    }

    this.logger.error('“完成编辑”按钮是灰的，关闭弹窗');
    const cancelButton = page.locator('button:has-text("取消")');
    if (await cancelButton.count()) {
      await cancelButton.click();
    } else {
      await page.locator('.semi-modal-close').click();
    }
    await page.waitForSelector('.semi-modal-content', {
      state: 'hidden',
      timeout: 5000,
    });
    return false;
  }

  protected async setProductLink(
    page: Page,
    productLink: string,
    productTitle: string,
  ): Promise<boolean> {
    await page.waitForTimeout(2000);
    try {
      await page.waitForSelector('text=添加标签', { timeout: 10000 });
      const dropdown = page
        .getByText('添加标签')
        .locator('..')
        .locator('..')
        .locator('..')
        .locator('.semi-select')
        .first();
      if ((await dropdown.count()) === 0) {
        this.logger.error('没找到标签下拉框');
        return false;
      }
      await dropdown.click();
      await page.waitForSelector('[role="listbox"]', { timeout: 5000 });
      await page.locator('[role="option"]:has-text("购物车")').click();

      await page.waitForSelector('input[placeholder="粘贴商品链接"]', {
        timeout: 5000,
      });
      await page.locator('input[placeholder="粘贴商品链接"]').fill(productLink);

      const addButton = page.locator('span:has-text("添加链接")');
      const buttonClass = (await addButton.getAttribute('class')) ?? '';
      if (buttonClass.includes('disable')) {
        this.logger.error('“添加链接”按钮现在点不了');
        return false;
      }
      await addButton.click();

      await page.waitForTimeout(2000);
      const errorModal = page.locator('text=未搜索到对应商品');
      if (await errorModal.count()) {
        await page.locator('button:has-text("确定")').click();
        this.logger.error('这个商品链接无效');
        return false;
      }

      return this.handleProductDialog(page, productTitle);
    } catch (e) {
      this.logger.error(
        `设置商品链接时出错: ${e instanceof Error ? e.message : String(e)}`,
      );
      return false;
    }
  }
}
