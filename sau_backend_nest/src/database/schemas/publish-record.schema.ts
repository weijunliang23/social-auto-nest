import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type PublishRecordDocument = HydratedDocument<PublishRecord>;

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
}

export const PublishRecordSchema =
  SchemaFactory.createForClass(PublishRecord);

PublishRecordSchema.index({ ownerId: 1, created_at: -1 });
