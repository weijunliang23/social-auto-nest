import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type AppSessionDocument = HydratedDocument<AppSession>;

@Schema({ collection: 'app_sessions', timestamps: { createdAt: true, updatedAt: false } })
export class AppSession {
  @Prop({ required: true, unique: true, index: true })
  token!: string;

  @Prop({ type: Types.ObjectId, ref: 'AppUser', required: true, index: true })
  userId!: Types.ObjectId;

  /** 7 天后自动过期 */
  @Prop({ default: () => new Date(), expires: 604800 })
  createdAt!: Date;
}

export const AppSessionSchema = SchemaFactory.createForClass(AppSession);
