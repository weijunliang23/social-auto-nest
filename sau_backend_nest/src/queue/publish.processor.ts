import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PublishRecordService } from '../modules/publish-record/publish-record.service';
import { MEDIA_TYPE } from '../shared/platform.constants';
import { DouyinPublishService } from '../uploaders/douyin/douyin-publish.service';
import { KuaishouPublishService } from '../uploaders/kuaishou/kuaishou-publish.service';
import { TencentPublishService } from '../uploaders/tencent/tencent-publish.service';
import { XiaohongshuPublishService } from '../uploaders/xiaohongshu/xiaohongshu-publish.service';
import type { PublishJobPayload } from './publish-job.types';
import { PUBLISH_QUEUE_NAME } from './publish.queue';

@Processor(PUBLISH_QUEUE_NAME, { concurrency: 1 })
export class PublishProcessor extends WorkerHost {
  private readonly logger = new Logger(PublishProcessor.name);

  constructor(
    private readonly publishRecordService: PublishRecordService,
    private readonly douyinPublishService: DouyinPublishService,
    private readonly kuaishouPublishService: KuaishouPublishService,
    private readonly xiaohongshuPublishService: XiaohongshuPublishService,
    private readonly tencentPublishService: TencentPublishService,
  ) {
    super();
  }

  async process(job: Job<PublishJobPayload>): Promise<void> {
    const { recordId, kind, platformType } = job.data;
    this.logger.log(
      `Processing publish job ${job.id} recordId=${recordId} kind=${kind} platform=${platformType}`,
    );

    if (await this.publishRecordService.isRecordCancelled(recordId)) {
      this.logger.log(`Job ${job.id} skipped: record cancelled`);
      return;
    }

    await this.publishRecordService.updateRecordStatus(
      recordId,
      'running',
      '正在发布',
    );

    try {
      switch (platformType) {
        case MEDIA_TYPE.DOUYIN:
          if (kind === 'video') {
            await this.douyinPublishService.publishVideo(job.data);
          } else {
            await this.douyinPublishService.publishNote(job.data);
          }
          break;
        case MEDIA_TYPE.KUAISHOU:
          if (kind === 'video') {
            await this.kuaishouPublishService.publishVideo(job.data);
          } else {
            await this.kuaishouPublishService.publishNote(job.data);
          }
          break;
        case MEDIA_TYPE.XHS:
          if (kind === 'video') {
            await this.xiaohongshuPublishService.publishVideo(job.data);
          } else {
            await this.xiaohongshuPublishService.publishNote(job.data);
          }
          break;
        case MEDIA_TYPE.TENCENT:
          if (kind !== 'video') {
            throw new Error('视频号不支持图文发布');
          }
          await this.tencentPublishService.publishVideo(job.data);
          break;
        default:
          throw new Error(`不支持的平台: ${platformType}`);
      }

      if (await this.publishRecordService.isRecordCancelled(recordId)) {
        this.logger.log(
          `Job ${job.id} finished but record cancelled, skip success update`,
        );
        return;
      }

      await this.publishRecordService.updateRecordStatus(
        recordId,
        'success',
        '发布成功',
      );
      this.logger.log(`Publish job ${job.id} completed successfully`);
    } catch (e) {
      if (await this.publishRecordService.isRecordCancelled(recordId)) {
        this.logger.log(`Job ${job.id} error ignored: record cancelled`);
        return;
      }
      const msg = e instanceof Error ? e.message : String(e);
      this.logger.error(`Publish job ${job.id} failed: ${msg}`);
      await this.publishRecordService.updateRecordStatus(
        recordId,
        'failed',
        msg,
      );
      throw e;
    }
  }
}
