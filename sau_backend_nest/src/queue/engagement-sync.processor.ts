import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import type { WorkStat } from '../database/schemas/publish-record.schema';
import { PublishRecordService } from '../modules/publish-record/publish-record.service';
import { AccountCookieLockService } from '../shared/lock/account-cookie-lock.service';
import { MEDIA_TYPE } from '../shared/platform.constants';
import type { AccountEngagementResult } from '../uploaders/engagement/engagement.types';
import { DouyinEngagementSync } from '../uploaders/douyin/douyin-engagement.sync';
import { KuaishouEngagementSync } from '../uploaders/kuaishou/kuaishou-engagement.sync';
import { XiaohongshuEngagementSync } from '../uploaders/xiaohongshu/xiaohongshu-engagement.sync';
import type { WorkLink } from '../uploaders/work-link';
import type { EngagementSyncJobPayload } from './engagement-sync.job.types';
import { ENGAGEMENT_SYNC_QUEUE_NAME } from './engagement-sync.queue';

@Processor(ENGAGEMENT_SYNC_QUEUE_NAME, { concurrency: 1 })
export class EngagementSyncProcessor extends WorkerHost {
  private readonly logger = new Logger(EngagementSyncProcessor.name);

  constructor(
    private readonly publishRecordService: PublishRecordService,
    private readonly accountCookieLock: AccountCookieLockService,
    private readonly xiaohongshuEngagementSync: XiaohongshuEngagementSync,
    private readonly douyinEngagementSync: DouyinEngagementSync,
    private readonly kuaishouEngagementSync: KuaishouEngagementSync,
  ) {
    super();
  }

  async process(job: Job<EngagementSyncJobPayload>): Promise<void> {
    const { recordId, ownerId } = job.data;
    this.logger.log(`刷新播放互动 recordId=${recordId}`);

    const record = await this.publishRecordService.getRecordById(
      recordId,
      ownerId,
    );
    if (!record || record.status !== 'success') {
      await this.publishRecordService.finishEngagementSync(
        recordId,
        ownerId,
        'failed',
        '仅成功的发布记录可刷新数据',
      );
      return;
    }

    await this.publishRecordService.markEngagementRunning(recordId, ownerId);

    try {
      const results = await this.accountCookieLock.withAccountLocks(
        ownerId,
        record.account_list,
        async () => {
          const collected: AccountEngagementResult[] = [];
          for (const account of record.account_list) {
            collected.push(await this.syncAccount(record, ownerId, account));
          }
          return collected;
        },
      );

      const workStats: WorkStat[] = results.map((item) => item.stat);
      const workLinks: WorkLink[] = results
        .map((item) => item.workLink)
        .filter((link): link is WorkLink => Boolean(link));

      const unmatched = results.filter(
        (item) => item.stat.match === 'unmatched',
      );
      const status =
        unmatched.length === results.length && results.length > 0
          ? 'failed'
          : 'ok';
      const message =
        status === 'failed'
          ? unmatched[0]?.stat
            ? '未匹配到作品，请确认已公开或稍后重试'
            : '未匹配到作品'
          : unmatched.length
            ? `已同步，其中 ${unmatched.length} 个账号未匹配到作品`
            : '已同步播放与互动';

      await this.publishRecordService.saveEngagementResult(
        recordId,
        ownerId,
        workStats,
        workLinks,
        status,
        message,
      );
      this.logger.log(`刷新完成 recordId=${recordId} status=${status}`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      this.logger.error(`刷新失败 recordId=${recordId}: ${msg}`);
      await this.publishRecordService.finishEngagementSync(
        recordId,
        ownerId,
        'failed',
        msg,
      );
    }
  }

  private async syncAccount(
    record: {
      title: string;
      publish_kind: 'video' | 'note';
      platform_type: number;
      work_links?: { account: string; url: string }[];
      created_at?: Date;
      schedule_enabled?: boolean;
      schedule_config?: Record<string, unknown>;
    },
    ownerId: string,
    account: string,
  ): Promise<AccountEngagementResult> {
    const workUrl = (record.work_links ?? []).find(
      (link) => link.account === account,
    )?.url;
    const publishedAt = this.publishRecordService.estimatePublishedAt(record);
    const input = {
      ownerId,
      account,
      accountFile: this.cookiePath(record.platform_type, ownerId, account),
      title: record.title,
      publishedAt,
      workUrl,
      publishKind: record.publish_kind,
    };

    if (record.platform_type === MEDIA_TYPE.XHS) {
      return this.xiaohongshuEngagementSync.sync(input);
    }
    if (record.platform_type === MEDIA_TYPE.DOUYIN) {
      return this.douyinEngagementSync.sync(input);
    }
    if (record.platform_type === MEDIA_TYPE.KUAISHOU) {
      return this.kuaishouEngagementSync.sync(input);
    }
    throw new Error('该平台暂不支持刷新播放与互动');
  }

  private cookiePath(
    platformType: number,
    ownerId: string,
    account: string,
  ): string {
    if (platformType === MEDIA_TYPE.XHS) {
      return this.xiaohongshuEngagementSync.cookiePath(ownerId, account);
    }
    if (platformType === MEDIA_TYPE.DOUYIN) {
      return this.douyinEngagementSync.cookiePath(ownerId, account);
    }
    return this.kuaishouEngagementSync.cookiePath(ownerId, account);
  }
}
