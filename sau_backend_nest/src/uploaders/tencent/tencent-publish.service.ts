import { Inject, Injectable, Logger } from '@nestjs/common';
import { join } from 'path';
import type { AppConfig } from '../../config/app-config.interface';
import appConfig from '../../config/app.config';
import { AuthService } from '../../modules/account/auth.service';
import type { PublishJobPayload } from '../../queue/publish-job.types';
import { BrowserService } from '../../shared/browser/browser.service';
import { userCookiesDir, userVideoDir } from '../../shared/paths/user-paths.util';
import { generateScheduleTimeNextDay } from '../../shared/schedule/schedule.util';
import { resolveTencentCategory } from './tencent.constants';
import { TencentVideoUploader } from './tencent-video.uploader';

/** 封装视频号发布循环，供 PublishProcessor 调用 */
@Injectable()
export class TencentPublishService {
  private readonly logger = new Logger(TencentPublishService.name);

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

  async publishVideo(payload: PublishJobPayload): Promise<void> {
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
      category,
      isDraft,
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

    const categoryLabel = resolveTencentCategory(category);

    for (let index = 0; index < fileList.length; index++) {
      const file = fileList[index];
      const filePath = this.videoPath(ownerId, file);
      const publishDate = publishDatetimes[index];

      for (const account of accountList) {
        const accountFile = this.cookiePath(ownerId, account);
        this.logger.log(
          `发布视频 file=${file} account=${account} title=${title}`,
        );
        const uploader = new TencentVideoUploader(
          this.browserService,
          this.authService,
          this.app,
          {
            title,
            filePath,
            tags,
            publishDate,
            accountFile,
            category: categoryLabel,
            isDraft: isDraft ?? false,
            browserPublish,
          },
        );
        await uploader.upload();
      }
    }
  }
}
