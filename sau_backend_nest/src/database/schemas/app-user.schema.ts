import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type AppUserDocument = HydratedDocument<AppUser>;

@Schema({ collection: 'app_users', timestamps: { createdAt: true, updatedAt: false } })
export class AppUser {
  @Prop({ required: true, unique: true, maxlength: 15, trim: true })
  username!: string;

  @Prop({ required: true, maxlength: 15 })
  password!: string;
}

export const AppUserSchema = SchemaFactory.createForClass(AppUser);
