import { Inject, Injectable, Logger } from '@nestjs/common';
import { existsSync } from 'fs';
import { join } from 'path';
import type {
  Browser as PlaywrightBrowser,
  BrowserContext as PlaywrightContext,
} from 'playwright';
import { chromium as playwrightChromium } from 'playwright';
import type {
  Browser as PatchrightBrowser,
  BrowserContext as PatchrightContext,
} from 'patchright';
import { chromium as patchrightChromium } from 'patchright';
import type { AppConfig } from '../../config/app-config.interface';
import appConfig from '../../config/app.config';

export interface BrowserLaunchOptions {
  /** 是否使用抖音防风控启动参数 */
  antiDetect?: boolean;
  /** 浏览器语言参数，如 en-GB */
  lang?: string;
  /** 单次启动覆盖 conf.localChromeHeadless */
  headless?: boolean;
}

/** 统一浏览器启动与 stealth 注入，读取 conf.ts 的 localChromeHeadless */
@Injectable()
export class BrowserService {
  private readonly logger = new Logger(BrowserService.name);
  /** stealth.min.js 路径：Nest 编译后在 dist/shared/，源码在 src/shared/ */
  private readonly stealthPath = this.resolveStealthPath();

  constructor(
    @Inject(appConfig.KEY)
    private readonly app: AppConfig,
  ) { }

  /** 解析 stealth.min.js 实际路径（兼容 dist 与 src 目录） */
  private resolveStealthPath(): string {
    const candidates = [
      join(__dirname, '..', '..', '..', 'shared', 'stealth', 'stealth.min.js'),
      join(__dirname, '..', 'stealth', 'stealth.min.js'),
      join(process.cwd(), 'src', 'shared', 'stealth', 'stealth.min.js'),
    ];
    for (const p of candidates) {
      if (existsSync(p)) {
        return p;
      }
    }
    return candidates[0];
  }

  /** 构建 Chromium 启动参数 */
  private buildLaunchOptions(opts?: BrowserLaunchOptions) {
    const args: string[] = [];
    if (opts?.antiDetect) {
      args.push(
        '--disable-blink-features=AutomationControlled',
        '--lang=zh-CN',
        '--disable-infobars',
        '--start-maximized',
      );
    } else if (opts?.lang) {
      args.push(`--lang ${opts.lang}`);
    }

    const launchOpts: {
      headless: boolean;
      args: string[];
      channel?: 'chrome';
      executablePath?: string;
    } = {
      headless: opts?.headless ?? this.app.localChromeHeadless,
      args,
    };

    if (this.app.localChromePath) {
      launchOpts.executablePath = this.app.localChromePath;
    } else {
      launchOpts.channel = 'chrome';
    }

    return launchOpts;
  }

  /** browserVisible=true 时有头，否则走 conf.localChromeHeadless */
  resolveHeadless(browserVisible?: boolean): boolean {
    if (browserVisible === true) {
      return false;
    }
    return this.app.localChromeHeadless;
  }

  /** 启动 patchright 浏览器（抖音/快手/小红书） */
  async launchPatchright(
    opts?: BrowserLaunchOptions,
  ): Promise<PatchrightBrowser> {
    const launchOpts = this.buildLaunchOptions(opts);
    this.logger.debug(`launchPatchright headless=${launchOpts.headless}`);
    return await patchrightChromium.launch(launchOpts);
  }

  /** 启动 playwright 浏览器（视频号） */
  async launchPlaywright(
    opts?: BrowserLaunchOptions,
  ): Promise<PlaywrightBrowser> {
    const launchOpts = this.buildLaunchOptions(opts);
    this.logger.debug(`launchPlaywright headless=${launchOpts.headless}`);
    return await playwrightChromium.launch(launchOpts);
  }

  /** 向浏览器上下文注入 stealth.min.js，等价 Python set_init_script */
  async addStealthScript(
    context: PatchrightContext | PlaywrightContext,
  ): Promise<PatchrightContext | PlaywrightContext> {
    await context.addInitScript({ path: this.stealthPath });
    return context;
  }
}
