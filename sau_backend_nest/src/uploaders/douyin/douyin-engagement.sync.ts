import { Inject, Injectable, Logger } from '@nestjs/common';
import { join } from 'path';
import type { AppConfig } from '../../config/app-config.interface';
import appConfig from '../../config/app.config';
import { BrowserService } from '../../shared/browser/browser.service';
import { userCookiesDir } from '../../shared/paths/user-paths.util';
import { toAccountResult } from '../engagement/build-result';
import {
  collectCreatorWorks,
  withCreatorPage,
} from '../engagement/creator-session';
import type {
  AccountEngagementResult,
  EngagementSyncInput,
} from '../engagement/engagement.types';
import { matchCreatorWork } from '../engagement/match-work';
import { parseWorkIdFromUrl } from '../engagement/work-identity';

const DOUYIN_MANAGE_URL =
  'https://creator.douyin.com/creator-micro/content/manage';

@Injectable()
export class DouyinEngagementSync {
  private readonly logger = new Logger(DouyinEngagementSync.name);

  constructor(
    private readonly browserService: BrowserService,
    @Inject(appConfig.KEY)
    private readonly app: AppConfig,
  ) {}

  cookiePath(ownerId: string, filename: string): string {
    return join(userCookiesDir(this.app.baseDir, ownerId), filename);
  }

  async sync(input: EngagementSyncInput): Promise<AccountEngagementResult> {
    const works = await withCreatorPage(
      this.browserService,
      input.accountFile,
      async (page) =>
        collectCreatorWorks(page, 'douyin', DOUYIN_MANAGE_URL, this.logger),
    );
    this.logger.log(
      `抖音作品列表 ${works.length} 条 account=${input.account}`,
    );
    const matched = matchCreatorWork(works, {
      workId: parseWorkIdFromUrl('douyin', input.workUrl),
      title: input.title,
      publishedAt: input.publishedAt,
    });
    return toAccountResult(input.account, input.accountFile, 'douyin', matched);
  }
}
