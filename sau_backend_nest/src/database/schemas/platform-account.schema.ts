import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type PlatformAccountDocument = HydratedDocument<PlatformAccount>;

@Schema({ collection: 'platform_accounts', timestamps: false })
export class PlatformAccount {
  @Prop({ type: Types.ObjectId, ref: 'AppUser', required: true, index: true })
  ownerId!: Types.ObjectId;

  /** 1 小红书 / 2 视频号 / 3 抖音 / 4 快手 */
  @Prop({ required: true })
  type!: number;

  @Prop({ required: true })
  filePath!: string;

  @Prop({ required: true })
  userName!: string;

  @Prop({ default: 0 })
  status!: number;

  /** 最近一次 Cookie 校验时间，1 小时内可跳过浏览器校验 */
  @Prop({ type: Date })
  statusCheckedAt?: Date;
}

export const PlatformAccountSchema =
  SchemaFactory.createForClass(PlatformAccount);

PlatformAccountSchema.index({ ownerId: 1, filePath: 1 }, { unique: true });
