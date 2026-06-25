import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type MaterialDocument = HydratedDocument<Material>;

@Schema({ collection: 'materials', timestamps: { createdAt: 'upload_time', updatedAt: false } })
export class Material {
  @Prop({ type: Types.ObjectId, ref: 'AppUser', required: true, index: true })
  ownerId!: Types.ObjectId;

  @Prop({ required: true })
  filename!: string;

  @Prop()
  filesize?: number;

  @Prop({ required: true })
  file_path!: string;
}

export const MaterialSchema = SchemaFactory.createForClass(Material);
