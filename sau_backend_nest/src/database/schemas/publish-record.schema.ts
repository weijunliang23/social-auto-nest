import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type PublishRecordDocument = HydratedDocument<PublishRecord>;

export type WorkStatMatch = 'id' | 'title' | 'unmatched';

export interface WorkStat {
  account: string;
  play_count?: number | null;
  like_count?: number | null;
  comment_count?: number | null;
  collect_count?: number | null;
  share_count?: number | null;
  match: WorkStatMatch;
  synced_at?: Date | null;
}

export type EngagementSyncStatus =
  | 'idle'
  | 'queued'
  | 'running'
  | 'ok'
  | 'failed'
  | 'unsupported';

export interface EngagementSyncState {
  status: EngagementSyncStatus;
  message?: string;
  requested_at?: Date | null;
  finished_at?: Date | null;
}

@Schema({ collection: 'publish_records', timestamps: { createdAt: 'created_at', updatedAt: false } })
export class PublishRecord {
  @Prop({ type: Types.ObjectId, ref: 'AppUser', required: true, index: true })
  ownerId!: Types.ObjectId;

  @Prop({ required: true, enum: ['video', 'note'] })
  publish_kind!: 'video' | 'note';

  @Prop({ required: true })
  platform_type!: number;

  @Prop({ required: true })
  title!: string;

  @Prop({ default: '' })
  note_body!: string;

  @Prop({ type: [String], default: [] })
  tags!: string[];

  @Prop({ type: [String], required: true })
  file_list!: string[];

  @Prop({ type: [String], required: true })
  account_list!: string[];

  @Prop({ type: [String], default: [] })
  account_names!: string[];

  @Prop({ required: true })
  status!: string;

  @Prop({ default: '' })
  status_message!: string;

  @Prop({ default: false })
  schedule_enabled!: boolean;

  @Prop({ type: Object, default: {} })
  schedule_config!: Record<string, unknown>;

  @Prop({ type: Object, default: {} })
  extra_config!: Record<string, unknown>;

  /** 发布成功后抓到的作品地址；抓取失败时为空 */
  @Prop({
    type: [
      {
        account: { type: String, required: true },
        file: { type: String },
        url: { type: String, required: true },
        kind: { type: String, enum: ['public', 'creator'], required: true },
      },
    ],
    default: [],
  })
  work_links!: {
    account: string;
    file?: string;
    url: string;
    kind: 'public' | 'creator';
  }[];

  /** 按账号拆分的播放 / 互动快照 */
  @Prop({
    type: [
      {
        _id: false,
        account: { type: String, required: true },
        play_count: { type: Number, default: null },
        like_count: { type: Number, default: null },
        comment_count: { type: Number, default: null },
        collect_count: { type: Number, default: null },
        share_count: { type: Number, default: null },
        match: {
          type: String,
          enum: ['id', 'title', 'unmatched'],
          required: true,
        },
        synced_at: { type: Date, default: null },
      },
    ],
    default: [],
  })
  work_stats!: WorkStat[];

  @Prop({
    type: {
      _id: false,
      status: {
        type: String,
        enum: ['idle', 'queued', 'running', 'ok', 'failed', 'unsupported'],
        default: 'idle',
      },
      message: { type: String, default: '' },
      requested_at: { type: Date, default: null },
      finished_at: { type: Date, default: null },
    },
    default: () => ({
      status: 'idle',
      message: '',
      requested_at: null,
      finished_at: null,
    }),
  })
  engagement_sync!: EngagementSyncState;

  created_at?: Date;
}

export const PublishRecordSchema =
  SchemaFactory.createForClass(PublishRecord);

PublishRecordSchema.index({ ownerId: 1, created_at: -1 });
