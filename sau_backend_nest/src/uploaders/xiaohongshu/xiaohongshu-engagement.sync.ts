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

const XHS_NOTE_MANAGER_URL =
  'https://creator.xiaohongshu.com/new/note-manager';

@Injectable()
export class XiaohongshuEngagementSync {
  private readonly logger = new Logger(XiaohongshuEngagementSync.name);

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
      async (page) => {
        const first = await collectCreatorWorks(
          page,
          'xiaohongshu',
          XHS_NOTE_MANAGER_URL,
          this.logger,
        );
        if (first.length) {
          return first;
        }
        return collectCreatorWorks(
          page,
          'xiaohongshu',
          'https://creator.xiaohongshu.com/new/home',
          this.logger,
        );
      },
    );
    this.logger.log(
      `小红书作品列表 ${works.length} 条 account=${input.account}`,
    );
    const matched = matchCreatorWork(works, {
      workId: parseWorkIdFromUrl('xiaohongshu', input.workUrl),
      title: input.title,
      publishedAt: input.publishedAt,
    });
    return toAccountResult(
      input.account,
      input.accountFile,
      'xiaohongshu',
      matched,
    );
  }
}
