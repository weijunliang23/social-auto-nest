import { Inject, Injectable, Logger } from '@nestjs/common';
import { join } from 'path';
import type { AppConfig } from '../../config/app-config.interface';
import appConfig from '../../config/app.config';
import { AuthService } from '../../modules/account/auth.service';
import type { PublishJobPayload } from '../../queue/publish-job.types';
import { BrowserService } from '../../shared/browser/browser.service';
import { userCookiesDir, userVideoDir } from '../../shared/paths/user-paths.util';
import {
  generateScheduleTimeNextDay,
  resolvePublishDate,
} from '../../shared/schedule/schedule.util';
import {
  XIAOHONGSHU_PUBLISH_STRATEGY_IMMEDIATE,
  XIAOHONGSHU_PUBLISH_STRATEGY_SCHEDULED,
} from './xiaohongshu.constants';
import { XiaohongshuNoteUploader } from './xiaohongshu-note.uploader';
import { XiaohongshuVideoUploader } from './xiaohongshu-video.uploader';
import type { WorkLink } from '../work-link';
import { withAccount } from '../work-link';

@Injectable()
export class XiaohongshuPublishService {
  private readonly logger = new Logger(XiaohongshuPublishService.name);

  constructor(
    private readonly browserService: BrowserService,
    private readonly authService: AuthService,
    @Inject(appConfig.KEY)
    private readonly app: AppConfig,
  ) {}

  private videoPath(ownerId: string, filename: string): string {
    return join(userVideoDir(this.app.baseDir, ownerId), filename);
  }

  private cookiePath(ownerId: string, filename: string): string {
    return join(userCookiesDir(this.app.baseDir, ownerId), filename);
  }

  async publishVideo(payload: PublishJobPayload): Promise<WorkLink[]> {
    const {
      ownerId,
      title,
      tags,
      fileList,
      accountList,
      enableTimer,
      videosPerDay,
      dailyTimes,
      startDays,
      thumbnail,
      browserPublish,
    } = payload;

    let publishDatetimes: (Date | 0)[];
    if (enableTimer) {
      publishDatetimes = generateScheduleTimeNextDay(
        fileList.length,
        videosPerDay ?? 1,
        dailyTimes,
        startDays ?? 0,
      );
    } else {
      publishDatetimes = fileList.map(() => 0 as const);
    }

    const links: WorkLink[] = [];
    for (let index = 0; index < fileList.length; index++) {
      const file = fileList[index];
      const filePath = this.videoPath(ownerId, file);
      const thumbnailPath = thumbnail
        ? this.videoPath(ownerId, thumbnail)
        : undefined;
      const publishDate = publishDatetimes[index];
      const strategy = enableTimer
        ? XIAOHONGSHU_PUBLISH_STRATEGY_SCHEDULED
        : XIAOHONGSHU_PUBLISH_STRATEGY_IMMEDIATE;

      for (const account of accountList) {
        const accountFile = this.cookiePath(ownerId, account);
        this.logger.log(
          `发布小红书视频 file=${file} account=${account} title=${title}`,
        );
        const uploader = new XiaohongshuVideoUploader(
          this.browserService,
          this.authService,
          this.app,
          {
            title,
            filePath,
            tags,
            publishDate,
            accountFile,
            thumbnailPath,
            publishStrategy: strategy,
            browserPublish,
          },
        );
        await uploader.upload().then((captured) => {
          if (captured) {
            links.push(withAccount(captured, account, file));
          }
        });
      }
    }
    return links;
  }

  async publishNote(payload: PublishJobPayload): Promise<WorkLink[]> {
    const {
      ownerId,
      title,
      note,
      tags,
      fileList,
      accountList,
      enableTimer,
      videosPerDay,
      dailyTimes,
      startDays,
      browserPublish,
    } = payload;

    const imagePaths = fileList.map((f) => this.videoPath(ownerId, f));
    const publishDate = resolvePublishDate(
      Boolean(enableTimer),
      videosPerDay,
      dailyTimes,
      startDays,
    );
    const strategy = enableTimer
      ? XIAOHONGSHU_PUBLISH_STRATEGY_SCHEDULED
      : XIAOHONGSHU_PUBLISH_STRATEGY_IMMEDIATE;

    const links: WorkLink[] = [];
    for (const account of accountList) {
      const accountFile = this.cookiePath(ownerId, account);
      this.logger.log(`发布小红书图文 account=${account} title=${title}`);
      const uploader = new XiaohongshuNoteUploader(
        this.browserService,
        this.authService,
        this.app,
        {
          imagePaths,
          note: note ?? '',
          tags,
          publishDate,
          accountFile,
          title,
          publishStrategy: strategy,
          browserPublish,
        },
      );
      await uploader.upload().then((captured) => {
        if (captured) {
          links.push(withAccount(captured, account));
        }
      });
    }
    return links;
  }
}
