import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Queue } from 'bullmq';
import type { PublishJobPayload } from '../../queue/publish-job.types';
import { PUBLISH_QUEUE_NAME } from '../../queue/publish.queue';
import {
  apiErr,
  apiOk,
  type ApiResponse,
} from '../../shared/api-response.util';
import { MEDIA_TYPE } from '../../shared/platform.constants';
import { AccountService } from '../account/account.service';
import { MaterialService } from '../material/material.service';
import { PublishRecordService } from '../publish-record/publish-record.service';
import type { PostNoteDto } from './dto/post-note.dto';
import type { PostVideoDto } from './dto/post-video.dto';

const SUPPORTED_PUBLISH_TYPES = [
  MEDIA_TYPE.XHS,
  MEDIA_TYPE.TENCENT,
  MEDIA_TYPE.DOUYIN,
  MEDIA_TYPE.KUAISHOU,
] as const;

@Injectable()
export class PublishService {
  private readonly logger = new Logger(PublishService.name);

  constructor(
    private readonly publishRecordService: PublishRecordService,
    private readonly accountService: AccountService,
    private readonly materialService: MaterialService,
    @InjectQueue(PUBLISH_QUEUE_NAME)
    private readonly publishQueue: Queue<PublishJobPayload>,
  ) {}

  private buildScheduleConfig(data: {
    enableTimer?: boolean | number;
    videosPerDay?: number;
    dailyTimes?: (string | number)[];
    startDays?: number;
  }): { enabled: boolean; config: Record<string, unknown> } {
    const enableTimer = Boolean(data.enableTimer);
    if (!enableTimer) {
      return { enabled: false, config: {} };
    }
    return {
      enabled: true,
      config: {
        videosPerDay: data.videosPerDay ?? 1,
        dailyTimes: data.dailyTimes ?? ['10:00'],
        startDays: data.startDays ?? 0,
      },
    };
  }

  private buildVideoExtraConfig(data: PostVideoDto): Record<string, unknown> {
    let category: number | null = data.category ?? null;
    if (category === 0) {
      category = null;
    }
    return {
      category,
      isDraft: data.isDraft ?? false,
      productLink: data.productLink ?? '',
      productTitle: data.productTitle ?? '',
      thumbnail: data.thumbnail ?? '',
    };
  }

  private async validateOwnership(
    ownerId: string,
    fileList: string[],
    accountList: string[],
  ): Promise<ApiResponse<null> | null> {
    const accountsOk = await this.accountService.validateAccountOwnership(
      ownerId,
      accountList,
    );
    if (!accountsOk) {
      return apiErr(403, '账号列表包含无权使用的 Cookie');
    }

    const materialsOk = await this.materialService.validateMaterialOwnership(
      ownerId,
      fileList,
    );
    if (!materialsOk) {
      return apiErr(403, '素材列表包含无权使用的文件');
    }

    return null;
  }

  private async enqueue(
    ownerId: string,
    payload: Omit<PublishJobPayload, 'recordId' | 'ownerId'>,
    recordInput: Omit<
      Parameters<PublishRecordService['createQueuedRecord']>[0],
      'ownerId'
    >,
  ): Promise<ApiResponse<null>> {
    const ownershipError = await this.validateOwnership(
      ownerId,
      payload.fileList,
      payload.accountList,
    );
    if (ownershipError) {
      return ownershipError;
    }

    const recordId = await this.publishRecordService.createQueuedRecord({
      ...recordInput,
      ownerId,
    });
    const jobPayload: PublishJobPayload = { ...payload, recordId, ownerId };

    try {
      await this.publishQueue.add('publish', jobPayload, {
        jobId: `publish-${recordId}`,
        removeOnComplete: true,
        removeOnFail: false,
      });
      const msg =
        payload.kind === 'video' ? '发布任务已提交' : '图文发布任务已提交';
      return apiOk(null, msg);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      this.logger.error(`入队失败 recordId=${recordId}: ${msg}`);
      await this.publishRecordService.updateRecordStatus(
        recordId,
        'failed',
        msg,
      );
      return apiErr(500, `发布失败: ${msg}`);
    }
  }

  postVideo(ownerId: string, data: PostVideoDto): Promise<ApiResponse<null>> {
    if (!data) {
      return Promise.resolve(apiErr(400, '请求数据不能为空'));
    }
    if (!data.fileList?.length) {
      return Promise.resolve(apiErr(400, '文件列表不能为空'));
    }
    if (!data.accountList?.length) {
      return Promise.resolve(apiErr(400, '账号列表不能为空'));
    }
    if (!data.type) {
      return Promise.resolve(apiErr(400, '平台类型不能为空'));
    }
    if (!data.title) {
      return Promise.resolve(apiErr(400, '标题不能为空'));
    }
    if (
      !SUPPORTED_PUBLISH_TYPES.includes(
        data.type as (typeof SUPPORTED_PUBLISH_TYPES)[number],
      )
    ) {
      return Promise.resolve(
        apiErr(400, `不支持的平台类型: ${data.type}`),
      );
    }

    const schedule = this.buildScheduleConfig(data);
    const extraConfig = this.buildVideoExtraConfig(data);

    return this.enqueue(
      ownerId,
      {
        kind: 'video',
        platformType: data.type,
        title: data.title,
        tags: data.tags,
        fileList: data.fileList,
        accountList: data.accountList,
        enableTimer: data.enableTimer,
        videosPerDay: data.videosPerDay,
        dailyTimes: data.dailyTimes,
        startDays: data.startDays,
        productLink: data.productLink,
        productTitle: data.productTitle,
        thumbnail: data.thumbnail,
        category: extraConfig.category as number | null,
        isDraft: data.isDraft,
        browserPublish: data.browserPublish,
      },
      {
        publishKind: 'video',
        platformType: data.type,
        title: data.title,
        fileList: data.fileList,
        accountList: data.accountList,
        tags: data.tags,
        scheduleEnabled: schedule.enabled,
        scheduleConfig: schedule.config,
        extraConfig,
      },
    );
  }

  postNote(ownerId: string, data: PostNoteDto): Promise<ApiResponse<null>> {
    if (!data) {
      return Promise.resolve(apiErr(400, '请求数据不能为空'));
    }
    if (!data.fileList?.length) {
      return Promise.resolve(apiErr(400, '图片列表不能为空'));
    }
    if (!data.accountList?.length) {
      return Promise.resolve(apiErr(400, '账号列表不能为空'));
    }
    if (!data.type) {
      return Promise.resolve(apiErr(400, '平台类型不能为空'));
    }
    if (!data.title) {
      return Promise.resolve(apiErr(400, '标题不能为空'));
    }
    if (data.type === MEDIA_TYPE.TENCENT) {
      return Promise.resolve(apiErr(400, '视频号不支持图文发布'));
    }
    if (
      !SUPPORTED_PUBLISH_TYPES.includes(
        data.type as (typeof SUPPORTED_PUBLISH_TYPES)[number],
      )
    ) {
      return Promise.resolve(
        apiErr(400, `不支持的平台类型: ${data.type}`),
      );
    }

    const schedule = this.buildScheduleConfig(data);
    const note = data.note ?? '';

    return this.enqueue(
      ownerId,
      {
        kind: 'note',
        platformType: data.type,
        title: data.title,
        note,
        tags: data.tags,
        fileList: data.fileList,
        accountList: data.accountList,
        enableTimer: data.enableTimer,
        videosPerDay: data.videosPerDay,
        dailyTimes: data.dailyTimes,
        startDays: data.startDays,
        browserPublish: data.browserPublish,
      },
      {
        publishKind: 'note',
        platformType: data.type,
        title: data.title,
        noteBody: note,
        fileList: data.fileList,
        accountList: data.accountList,
        tags: data.tags,
        scheduleEnabled: schedule.enabled,
        scheduleConfig: schedule.config,
      },
    );
  }

  async postVideoBatch(
    ownerId: string,
    dataList: PostVideoDto[],
  ): Promise<ApiResponse<null>> {
    if (!Array.isArray(dataList)) {
      return apiErr(400, 'Expected a JSON array');
    }
    for (const data of dataList) {
      await this.postVideo(ownerId, data);
    }
    return apiOk(null, null);
  }
}
