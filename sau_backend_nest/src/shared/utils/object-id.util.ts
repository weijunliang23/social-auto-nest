import { Types } from 'mongoose';

export function isValidObjectId(value: string | undefined): value is string {
  return Boolean(value && Types.ObjectId.isValid(value));
}

export function toObjectId(value: string): Types.ObjectId {
  return new Types.ObjectId(value);
}
