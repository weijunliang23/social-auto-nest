import { Inject, Injectable, Logger } from '@nestjs/common';
import { join } from 'path';
import type { Page } from 'patchright';
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

const KUAISHOU_MANAGE_URL =
  'https://cp.kuaishou.com/article/manage/video?status=2';

@Injectable()
export class KuaishouEngagementSync {
  private readonly logger = new Logger(KuaishouEngagementSync.name);

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
        collectCreatorWorks(
          page,
          'kuaishou',
          KUAISHOU_MANAGE_URL,
          this.logger,
          input.publishKind === 'note'
            ? (opened) => this.openNoteTabIfNeeded(opened, input)
            : undefined,
        ),
    );
    this.logger.log(
      `快手作品列表 ${works.length} 条 account=${input.account}`,
    );
    const matched = matchCreatorWork(works, {
      workId: parseWorkIdFromUrl('kuaishou', input.workUrl),
      title: input.title,
      publishedAt: input.publishedAt,
    });
    return toAccountResult(
      input.account,
      input.accountFile,
      'kuaishou',
      matched,
    );
  }

  private async openNoteTabIfNeeded(
    page: Page,
    input: EngagementSyncInput,
  ): Promise<void> {
    const noteTab = page.getByText('图文', { exact: true });
    if ((await noteTab.count()) === 0) {
      return;
    }
    try {
      await noteTab.first().click({ timeout: 3000 });
      await page.waitForTimeout(800);
    } catch {
      this.logger.debug(`快手图文 Tab 未点到 account=${input.account}`);
    }
  }
}
