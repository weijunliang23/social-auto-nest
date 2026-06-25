import { existsSync } from 'fs';
import { Logger } from '@nestjs/common';
import { basename } from 'path';
import type { Page } from 'playwright';
import type { AuthService } from '../../modules/account/auth.service';
import type { AppConfig } from '../../config/app-config.interface';
import type { BrowserService } from '../../shared/browser/browser.service';
import { MEDIA_TYPE } from '../../shared/platform.constants';
import { parseCookieStoragePath } from '../../shared/paths/user-paths.util';
import { BaseUploader } from '../base/base-uploader';
import {
  formatStrForShortTitle,
  TENCENT_POST_LIST_URL,
  TENCENT_PUBLISH_URL,
  TENCENT_PUBLISH_URL_PATTERN,
} from './tencent.constants';

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export abstract class TencentBaseUploader extends BaseUploader {
  protected readonly logger = new Logger(this.constructor.name);
  protected publishDate: Date | 0;
  protected readonly accountFile: string;
  protected readonly debug: boolean;
  protected readonly browserPublish: boolean;

  constructor(
    protected readonly browserService: BrowserService,
    protected readonly authService: AuthService,
    protected readonly appConfig: AppConfig,
    opts: {
      publishDate: Date | 0;
      accountFile: string;
      debug?: boolean;
      browserPublish?: boolean;
    },
  ) {
    super();
    this.publishDate = opts.publishDate;
    this.accountFile = opts.accountFile;
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
        `cookie文件不存在，请先完成视频号登录: ${this.accountFile}`,
      );
    }
    const { ownerId, filePath } = parseCookieStoragePath(this.accountFile);
    const valid = await this.authService.checkCookie(
      MEDIA_TYPE.TENCENT,
      filePath,
      { ownerId },
    );
    if (!valid) {
      throw new Error(
        `cookie文件已失效，请先完成视频号登录: ${this.accountFile}`,
      );
    }
    if (this.publishDate !== 0) {
      this.publishDate = BaseUploader.validatePublishDate(this.publishDate);
    }
  }

  protected async ensurePublishPageReady(page: Page): Promise<void> {
    await page.goto(TENCENT_PUBLISH_URL, {
      waitUntil: 'domcontentloaded',
      timeout: 60000,
    });
    await page.waitForURL(TENCENT_PUBLISH_URL_PATTERN, { timeout: 60000 });
    await page
      .waitForLoadState('networkidle', { timeout: 30000 })
      .catch(() => undefined);

    const shopLocator = page.locator('div.title-name:has-text("微信小店")');
    if (
      (await shopLocator.count()) > 0 &&
      (await shopLocator.first().isVisible().catch(() => false))
    ) {
      throw new Error('视频号 cookie 已失效，请重新登录');
    }

    const url = page.url();
    if (url.includes('login') || url.includes('passport')) {
      throw new Error('视频号未登录，请先完成扫码登录');
    }

    await this.dismissPublishDialogs(page);
  }

  protected async dismissPublishDialogs(page: Page): Promise<void> {
    const dismissTexts = ['我知道了', '知道了', '跳过', '关闭'];
    for (const text of dismissTexts) {
      const btn = page.getByRole('button', { name: text });
      if (
        (await btn.count()) > 0 &&
        (await btn.first().isVisible().catch(() => false))
      ) {
        await btn.first().click().catch(() => undefined);
        await sleep(500);
      }
    }
  }

  protected async uploadVideoFile(page: Page, filePath: string): Promise<void> {
    const selectors = [
      'input[type="file"][accept*="video"]',
      'input[type="file"][accept*="mp4"]',
      'input[type="file"]',
    ];

    for (const selector of selectors) {
      const input = page.locator(selector).first();
      try {
        await input.waitFor({ state: 'attached', timeout: 20000 });
        await input.setInputFiles(filePath, { timeout: 30000 });
        this.logger.log(`视频文件已选择: ${filePath}`);
        return;
      } catch {
        this.logger.debug(`选择器 ${selector} 未就绪，尝试下一个`);
      }
    }

    const uploadTriggerTexts = ['上传视频', '点击上传', '从本地选择', '选择视频'];
    for (const text of uploadTriggerTexts) {
      const trigger = page.getByText(text, { exact: false }).first();
      if ((await trigger.count()) === 0) {
        continue;
      }
      try {
        const fileChooserPromise = page.waitForEvent('filechooser', {
          timeout: 15000,
        });
        await trigger.click({ timeout: 5000 });
        const fileChooser = await fileChooserPromise;
        await fileChooser.setFiles(filePath);
        this.logger.log(`通过「${text}」选择视频: ${filePath}`);
        return;
      } catch {
        this.logger.debug(`点击「${text}」上传失败，尝试下一个`);
      }
    }

    throw new Error(
      `未找到视频上传控件，当前页面: ${page.url()}。请确认 cookie 有效且已进入发布页。`,
    );
  }

  protected async addTitleTags(
    page: Page,
    title: string,
    tags: string[],
  ): Promise<void> {
    await page.locator('div.input-editor').click();
    await page.keyboard.type(title);
    await page.keyboard.press('Enter');
    for (const tag of tags) {
      await page.keyboard.type(`#${tag}`);
      await page.keyboard.press('Space');
    }
    this.logger.log(`成功添加hashtag: ${tags.length}`);
  }

  protected async addCollection(page: Page): Promise<void> {
    const collectionElements = page
      .getByText('添加到合集')
      .locator('xpath=following-sibling::div')
      .locator('.option-list-wrap > div');
    if ((await collectionElements.count()) > 1) {
      await page
        .getByText('添加到合集')
        .locator('xpath=following-sibling::div')
        .click();
      await collectionElements.first().click();
    }
  }

  protected async addOriginal(
    page: Page,
    category: string | null,
  ): Promise<void> {
    if ((await page.getByLabel('视频为原创').count()) > 0) {
      await page.getByLabel('视频为原创').check();
    }
    const termsVisible = await page
      .locator('label:has-text("我已阅读并同意 《视频号原创声明使用条款》")')
      .isVisible();
    if (termsVisible) {
      await page
        .getByLabel('我已阅读并同意 《视频号原创声明使用条款》')
        .check();
      await page.getByRole('button', { name: '声明原创' }).click();
    }
    if (
      (await page.locator('div.label span:has-text("声明原创")').count()) > 0 &&
      category
    ) {
      const checkbox = page.locator(
        'div.declare-original-checkbox input.ant-checkbox-input',
      );
      if (!(await checkbox.isDisabled())) {
        await checkbox.click();
      }
      const checkedTerms = page.locator(
        'div.declare-original-dialog label.ant-checkbox-wrapper.ant-checkbox-wrapper-checked:visible',
      );
      if ((await checkedTerms.count()) === 0) {
        await page
          .locator('div.declare-original-dialog input.ant-checkbox-input:visible')
          .click();
      }
      const originalTypeLabel = page.locator(
        'div.original-type-form > div.form-label:has-text("原创类型"):visible',
      );
      if ((await originalTypeLabel.count()) > 0) {
        await page.locator('div.form-content:visible').click();
        await page
          .locator(
            `div.form-content:visible ul.weui-desktop-dropdown__list li.weui-desktop-dropdown__list-ele:has-text("${category}")`,
          )
          .first()
          .click();
        await page.waitForTimeout(1000);
      }
      const declareBtn = page.locator('button:has-text("声明原创"):visible');
      if ((await declareBtn.count()) > 0) {
        await declareBtn.click();
      }
    }
  }

  protected async handleUploadError(
    page: Page,
    filePath: string,
  ): Promise<void> {
    this.logger.log('视频出错了，重新上传中');
    await page
      .locator('div.media-status-content div.tag-inner:has-text("删除")')
      .click();
    await page.getByRole('button', { name: '删除', exact: true }).click();
    await this.uploadVideoFile(page, filePath);
  }

  protected async detectUploadStatus(
    page: Page,
    filePath: string,
  ): Promise<void> {
    while (true) {
      try {
        const publishBtn = page.getByRole('button', { name: '发表' });
        const className = (await publishBtn.getAttribute('class')) ?? '';
        if (!className.includes('weui-desktop-btn_disabled')) {
          this.logger.log('视频上传完毕');
          return;
        }
        this.logger.log('正在上传视频中...');
        await sleep(2000);
        const hasError = await page.locator('div.status-msg.error').count();
        const hasDelete = await page
          .locator('div.media-status-content div.tag-inner:has-text("删除")')
          .count();
        if (hasError > 0 && hasDelete > 0) {
          this.logger.error('发现上传出错了...准备重试');
          await this.handleUploadError(page, filePath);
        }
      } catch {
        this.logger.log('正在上传视频中...');
        await sleep(2000);
      }
    }
  }

  protected async setScheduleTimeTencent(
    page: Page,
    publishDate: Date,
  ): Promise<void> {
    const labelElement = page.locator('label').filter({ hasText: '定时' }).nth(1);
    await labelElement.click();
    await page.click('input[placeholder="请选择发表时间"]');

    const strMonth =
      publishDate.getMonth() + 1 > 9
        ? String(publishDate.getMonth() + 1)
        : `0${publishDate.getMonth() + 1}`;
    const currentMonth = `${strMonth}月`;
    const pageMonth = await page.innerText(
      'span.weui-desktop-picker__panel__label:has-text("月")',
    );
    if (pageMonth !== currentMonth) {
      await page.click('button.weui-desktop-btn__icon__right');
    }

    const elements = await page.$$('table.weui-desktop-picker__table a');
    for (const element of elements) {
      const className = await element.evaluate((el) => el.className);
      if (className.includes('weui-desktop-picker__disabled')) {
        continue;
      }
      const text = (await element.innerText()).trim();
      if (text === String(publishDate.getDate())) {
        await element.click();
        break;
      }
    }

    await page.click('input[placeholder="请选择时间"]');
    await page.keyboard.press('Control+KeyA');
    await page.keyboard.type(String(publishDate.getHours()));
    await page.locator('div.input-editor').click();
  }

  protected async addShortTitle(page: Page, title: string): Promise<void> {
    const shortTitleElement = page
      .getByText('短标题', { exact: true })
      .locator('..')
      .locator('xpath=following-sibling::div')
      .locator('span input[type="text"]');
    if ((await shortTitleElement.count()) > 0) {
      await shortTitleElement.fill(formatStrForShortTitle(title));
    }
  }

  protected async isDraftSaveSuccess(page: Page): Promise<boolean> {
    const url = page.url();
    if (url.includes('post/list') || url.includes('draft')) {
      return true;
    }
    const successPatterns = [
      '已保存',
      '保存成功',
      '草稿已保存',
      '已保存至草稿箱',
      '已保存到草稿箱',
    ];
    for (const text of successPatterns) {
      const el = page.getByText(text, { exact: false });
      if ((await el.count()) > 0 && (await el.first().isVisible())) {
        return true;
      }
    }
    const toast = page.locator(
      '.weui-desktop-toast, .weui-desktop-dialog__wrp, [class*="toast"]',
    );
    if ((await toast.count()) > 0) {
      const toastText = (await toast.first().innerText()).trim();
      if (successPatterns.some((p) => toastText.includes(p))) {
        return true;
      }
    }
    return false;
  }

  protected async isPublishSuccess(page: Page): Promise<boolean> {
    const url = page.url();
    return (
      url.includes(TENCENT_POST_LIST_URL) ||
      url.includes('/platform/post/list')
    );
  }

  protected isPageClosedError(e: unknown): boolean {
    const msg = e instanceof Error ? e.message : String(e);
    return msg.includes('has been closed') || msg.includes('Target closed');
  }

  protected async clickPublish(
    page: Page,
    isDraft: boolean,
  ): Promise<void> {
    const buttonSelector = isDraft
      ? 'div.form-btns button:has-text("保存草稿")'
      : 'div.form-btns button:has-text("发表")';
    const actionButton = page.locator(buttonSelector);
    if ((await actionButton.count()) > 0) {
      await actionButton.click();
    }

    const maxWaitMs = 120_000;
    const deadline = Date.now() + maxWaitMs;

    while (Date.now() < deadline) {
      try {
        const success = isDraft
          ? await this.isDraftSaveSuccess(page)
          : await this.isPublishSuccess(page);
        if (success) {
          this.logger.log(isDraft ? '视频草稿保存成功' : '视频发布成功');
          return;
        }
      } catch (e) {
        if (this.isPageClosedError(e)) {
          throw new Error(
            isDraft
              ? '浏览器已关闭，无法确认草稿是否保存成功'
              : '浏览器已关闭，无法确认视频是否发布成功',
          );
        }
        this.logger.debug(
          `等待发布完成: ${e instanceof Error ? e.message : String(e)}`,
        );
      }

      this.logger.log(
        isDraft ? '等待草稿保存完成...' : '视频正在发布中...',
      );
      await sleep(500);
    }

    throw new Error(
      isDraft
        ? '草稿保存超时：未检测到「已保存」提示或页面跳转'
        : '视频发布超时：未跳转到发布列表页',
    );
  }
}
