import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Queue } from 'bullmq';
import { Model, Types } from 'mongoose';
import { PublishRecord } from '../../database/schemas/publish-record.schema';
import { PlatformAccount } from '../../database/schemas/platform-account.schema';
import type { PublishJobPayload } from '../../queue/publish-job.types';
import { PUBLISH_QUEUE_NAME } from '../../queue/publish.queue';
import {
  apiErr,
  apiOk,
  type ApiResponse,
} from '../../shared/api-response.util';
import { MEDIA_TYPE } from '../../shared/platform.constants';
import { isValidObjectId, toObjectId } from '../../shared/utils/object-id.util';
import { AccountService } from '../account/account.service';
import { MaterialService } from '../material/material.service';

const PLATFORM_NAMES: Record<number, string> = {
  1: '小红书',
  2: '视频号',
  3: '抖音',
  4: '快手',
};

const STATUS_LABELS: Record<string, string> = {
  queued: '排队中',
  running: '执行中',
  success: '成功',
  failed: '失败',
  cancelled: '已取消',
};

export interface CreateQueuedRecordInput {
  ownerId: string;
  publishKind: 'video' | 'note';
  platformType: number;
  title: string;
  fileList: string[];
  accountList: string[];
  noteBody?: string;
  tags?: string[];
  scheduleEnabled?: boolean;
  scheduleConfig?: Record<string, unknown>;
  extraConfig?: Record<string, unknown>;
  statusMessage?: string;
}

/** 发布记录查询与软取消（按 ownerId 隔离） */
@Injectable()
export class PublishRecordService {
  private readonly logger = new Logger(PublishRecordService.name);

  constructor(
    @InjectModel(PublishRecord.name)
    private readonly publishRecordModel: Model<PublishRecord>,
    @InjectModel(PlatformAccount.name)
    private readonly platformAccountModel: Model<PlatformAccount>,
    @InjectQueue(PUBLISH_QUEUE_NAME)
    private readonly publishQueue: Queue<PublishJobPayload>,
    private readonly accountService: AccountService,
    private readonly materialService: MaterialService,
  ) { }

  /** 解析记录并附加中文标签，兼容前端 snake_case 字段 */
  private parsePublishRecordRow(
    row: PublishRecord & { _id: unknown; created_at?: Date },
  ): Record<string, unknown> {
    const record: Record<string, unknown> = {
      id: String(row._id),
      publish_kind: row.publish_kind,
      platform_type: row.platform_type,
      title: row.title,
      note_body: row.note_body,
      tags: row.tags,
      file_list: row.file_list,
      account_list: row.account_list,
      account_names: row.account_names,
      status: row.status,
      status_message: row.status_message,
      schedule_enabled: row.schedule_enabled ? 1 : 0,
      schedule_config: row.schedule_config,
      extra_config: row.extra_config,
      created_at: row.created_at,
    };

    const platformType = record.platform_type as number;
    record.platform_name = PLATFORM_NAMES[platformType] ?? '未知';
    record.publish_kind_label =
      record.publish_kind === 'note' ? '图文' : '视频';
    const status = String(record.status ?? '');
    record.status_label = STATUS_LABELS[status] ?? status;
    return record;
  }

  /** 按 ID 查询原始记录 */
  async getRecordById(
    recordId: string,
    ownerId?: string,
  ): Promise<(PublishRecord & { _id: unknown }) | null> {
    const filter: Record<string, unknown> = { _id: recordId };
    if (ownerId) {
      filter.ownerId = toObjectId(ownerId);
    }
    return this.publishRecordModel.findOne(filter).exec();
  }

  /** 记录是否已被取消 */
  async isRecordCancelled(recordId: string): Promise<boolean> {
    const record = await this.getRecordById(recordId);
    return record?.status === 'cancelled';
  }

  /** 解析 accountList 对应的 userName */
  async resolveAccountNames(
    ownerId: string,
    accountList: string[],
  ): Promise<string[]> {
    if (!accountList.length) {
      return [];
    }
    try {
      const accounts = await this.platformAccountModel
        .find({
          ownerId: toObjectId(ownerId),
          filePath: { $in: accountList },
        })
        .exec();
      const nameMap = new Map(accounts.map((a) => [a.filePath, a.userName]));
      return accountList.map((filePath) => nameMap.get(filePath) ?? filePath);
    } catch {
      return [...accountList];
    }
  }

  /** 入队前写入 publish_records，status=queued */
  async createQueuedRecord(input: CreateQueuedRecordInput): Promise<string> {
    const defaultMessage =
      input.publishKind === 'note' ? '图文发布任务已提交,可进行其他操作' : '发布任务已提交,可进行其他操作';
    const accountNames = await this.resolveAccountNames(
      input.ownerId,
      input.accountList,
    );

    const doc = await this.publishRecordModel.create({
      ownerId: toObjectId(input.ownerId),
      publish_kind: input.publishKind,
      platform_type: input.platformType,
      title: input.title,
      note_body: input.noteBody ?? '',
      tags: input.tags ?? [],
      file_list: input.fileList,
      account_list: input.accountList,
      account_names: accountNames,
      status: 'queued',
      status_message: input.statusMessage ?? defaultMessage,
      schedule_enabled: Boolean(input.scheduleEnabled),
      schedule_config: input.scheduleConfig ?? {},
      extra_config: input.extraConfig ?? {},
    });

    return String(doc._id);
  }

  /** Worker 更新 publish_records 状态（不覆盖 cancelled） */
  async updateRecordStatus(
    recordId: string,
    status: 'queued' | 'running' | 'success' | 'failed',
    statusMessage: string,
  ): Promise<void> {
    await this.publishRecordModel.updateOne(
      { _id: recordId, status: { $ne: 'cancelled' } },
      { status, status_message: statusMessage },
    );
  }

  /** 由 DB 记录还原 BullMQ 任务 payload */
  private buildJobPayloadFromRecord(
    record: PublishRecord & { _id: unknown },
    ownerId: string,
    recordId: string,
  ): PublishJobPayload {
    const schedule = (record.schedule_config ?? {}) as Record<string, unknown>;
    const extra = (record.extra_config ?? {}) as Record<string, unknown>;
    const platformType = record.platform_type;

    let browserPublish = extra.browserPublish as boolean | undefined;
    if (browserPublish === undefined) {
      browserPublish = platformType === MEDIA_TYPE.TENCENT;
    }

    const payload: PublishJobPayload = {
      recordId,
      ownerId,
      kind: record.publish_kind,
      platformType,
      title: record.title,
      tags: record.tags ?? [],
      fileList: record.file_list,
      accountList: record.account_list,
      enableTimer: record.schedule_enabled ? 1 : 0,
      videosPerDay: (schedule.videosPerDay as number | undefined) ?? 1,
      dailyTimes: (schedule.dailyTimes as (string | number)[] | undefined) ?? [
        '10:00',
      ],
      startDays: (schedule.startDays as number | undefined) ?? 0,
      browserPublish,
    };

    if (record.publish_kind === 'note') {
      payload.note = record.note_body ?? '';
    } else {
      let category = extra.category as number | null | undefined;
      if (category === 0) {
        category = null;
      }
      payload.category = category ?? null;
      payload.isDraft = Boolean(extra.isDraft);
      payload.productLink = (extra.productLink as string | undefined) ?? '';
      payload.productTitle = (extra.productTitle as string | undefined) ?? '';
      payload.thumbnail = (extra.thumbnail as string | undefined) ?? '';
    }

    return payload;
  }

  /** 重试前移除已结束的 job，以便复用 jobId */
  private async removePublishJobForRetry(recordId: string): Promise<void> {
    const job = await this.publishQueue.getJob(`publish-${recordId}`);
    if (!job) {
      return;
    }
    const state = await job.getState();
    const blocking = new Set(['active', 'waiting', 'delayed', 'prioritized']);
    if (blocking.has(state)) {
      throw new Error('任务进行中，请稍后再试');
    }
    await job.remove();
    this.logger.log(
      `Removed job publish-${recordId} for retry (state=${state})`,
    );
  }

  /** 失败记录重试：复用同一 recordId 重新入队 */
  async retryPublishRecord(
    ownerId: string,
    recordId: string | undefined,
    options?: { headedRetry?: boolean },
  ): Promise<ApiResponse<{ recordId: string }>> {
    if (!isValidObjectId(recordId)) {
      return apiErr(400, 'Invalid or missing record ID');
    }

    try {
      const record = await this.getRecordById(recordId!, ownerId);
      if (!record) {
        return apiErr(404, 'Record not found');
      }
      if (record.status !== 'failed') {
        return apiErr(400, '仅失败状态的记录可重试');
      }

      if (options?.headedRetry) {
        const extra = {
          ...((record.extra_config ?? {}) as Record<string, unknown>),
          browserPublish: true,
        };
        await this.publishRecordModel.updateOne(
          { _id: recordId, ownerId: toObjectId(ownerId) },
          { extra_config: extra },
        );
        record.extra_config = extra;
      }

      const accountsOk = await this.accountService.validateAccountOwnership(
        ownerId,
        record.account_list,
      );
      if (!accountsOk) {
        return apiErr(403, '账号列表包含无权使用的 Cookie 或账号已删除');
      }

      const materialsOk = await this.materialService.validateMaterialOwnership(
        ownerId,
        record.file_list,
      );
      if (!materialsOk) {
        return apiErr(403, '素材列表包含无权使用的文件或素材已删除');
      }

      await this.removePublishJobForRetry(recordId!);

      const payload = this.buildJobPayloadFromRecord(
        record,
        ownerId,
        recordId!,
      );
      const retryMessage = options?.headedRetry
        ? record.publish_kind === 'note'
          ? '图文有头浏览器重试任务已提交'
          : '有头浏览器重试任务已提交'
        : record.publish_kind === 'note'
          ? '图文发布重试任务已提交'
          : '发布重试任务已提交';

      await this.publishRecordModel.updateOne(
        { _id: recordId, ownerId: toObjectId(ownerId) },
        { status: 'queued', status_message: retryMessage },
      );

      await this.publishQueue.add('publish', payload, {
        jobId: `publish-${recordId}`,
        removeOnComplete: true,
        removeOnFail: false,
      });

      return apiOk({ recordId: recordId! }, retryMessage);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes('任务进行中')) {
        return apiErr(409, msg);
      }
      this.logger.error(`重试发布 recordId=${recordId}: ${msg}`);
      return apiErr(500, `重试失败: ${msg}`);
    }
  }

  /** 从 BullMQ 移除排队中的 job */
  private async cancelQueueJob(recordId: string): Promise<void> {
    const job = await this.publishQueue.getJob(`publish-${recordId}`);
    if (!job) {
      return;
    }
    const state = await job.getState();
    const removableStates = new Set(['waiting', 'delayed', 'prioritized']);
    if (removableStates.has(state)) {
      await job.remove();
      this.logger.log(`Removed queued job publish-${recordId} (state=${state})`);
    } else if (state === 'active') {
      this.logger.log(
        `Job publish-${recordId} is active, marked cancelled in DB only`,
      );
    }
  }

  /** 动态拼接查询条件 */
  private buildPublishRecordsFilter(
    ownerId: string,
    query: {
      platform?: string;
      kind?: string;
      status?: string;
      keyword?: string;
    },
  ): Record<string, unknown> {
    const filter: Record<string, unknown> = {
      ownerId: toObjectId(ownerId),
    };

    if (query.platform) {
      filter.platform_type = Number(query.platform);
    }
    if (query.kind) {
      filter.publish_kind = query.kind;
    }
    if (query.status) {
      filter.status = query.status;
    } else {
      filter.status = { $ne: 'cancelled' };
    }
    const keyword = (query.keyword ?? '').trim();
    if (keyword) {
      filter.title = { $regex: keyword, $options: 'i' };
    }

    return filter;
  }

  /** 按 ID 查询单条发布记录（当前用户） */
  async getPublishRecord(
    ownerId: string,
    recordId: string | undefined,
  ): Promise<ApiResponse<Record<string, unknown>>> {
    if (!isValidObjectId(recordId)) {
      return apiErr(400, 'Invalid or missing record ID');
    }

    try {
      const row = await this.getRecordById(recordId!, ownerId);
      if (!row) {
        return apiErr(404, 'Record not found');
      }
      return apiOk(this.parsePublishRecordRow(row), 'success');
    } catch (e) {
      return apiErr(
        500,
        `获取发布记录失败: ${e instanceof Error ? e.message : String(e)}`,
      );
    }
  }

  /** 动态拼接条件，按创建时间倒序分页返回 */
  async getPublishRecords(
    ownerId: string,
    query: {
      platform?: string;
      kind?: string;
      status?: string;
      keyword?: string;
      page?: string;
      limit?: string;
    },
  ): Promise<
    ApiResponse<{
      list: Record<string, unknown>[];
      total: number;
      page: number;
      limit: number;
    }>
  > {
    let page = 1;
    if (query.page !== undefined) {
      const parsed = Number(query.page);
      if (!Number.isNaN(parsed)) {
        page = Math.max(1, Math.floor(parsed));
      }
    }

    let limit = 20;
    if (query.limit !== undefined) {
      const parsed = Number(query.limit);
      if (!Number.isNaN(parsed)) {
        limit = Math.max(1, Math.min(parsed, 500));
      }
    }

    const skip = (page - 1) * limit;

    try {
      const filter = this.buildPublishRecordsFilter(ownerId, query);
      const total = await this.publishRecordModel.countDocuments(filter);
      const rows = await this.publishRecordModel
        .find(filter)
        .sort({ created_at: -1, _id: -1 })
        .skip(skip)
        .limit(limit)
        .exec();
      const list = rows.map((row) => this.parsePublishRecordRow(row));

      return apiOk({ list, total, page, limit }, 'success');
    } catch (e) {
      return apiErr(
        500,
        `获取发布记录失败: ${e instanceof Error ? e.message : String(e)}`,
      );
    }
  }

  /** 软取消发布记录，并从队列移除 waiting 中的 job */
  async deletePublishRecord(
    ownerId: string,
    recordId: string | undefined,
  ): Promise<ApiResponse<{ id: string }>> {
    if (!isValidObjectId(recordId)) {
      return apiErr(400, 'Invalid or missing record ID');
    }

    try {
      const record = await this.getRecordById(recordId!, ownerId);

      if (!record) {
        return apiErr(404, 'Record not found');
      }

      if (record.status === 'cancelled') {
        return apiOk({ id: recordId! }, 'Record already cancelled');
      }

      await this.publishRecordModel.updateOne(
        { _id: recordId, ownerId: toObjectId(ownerId) },
        { status: 'cancelled', status_message: '已取消' },
      );

      await this.cancelQueueJob(recordId!);

      return apiOk({ id: recordId! }, 'Record cancelled successfully');
    } catch (e) {
      return apiErr(
        500,
        `delete failed: ${e instanceof Error ? e.message : String(e)}`,
      );
    }
  }
}
