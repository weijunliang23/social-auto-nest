import type { WorkLinkPlatform } from '../capture-work-link';
import type { WorkLink } from '../work-link';
import type { WorkStat } from '../../database/schemas/publish-record.schema';

export interface CreatorWork {
  id: string;
  title: string;
  publishedAt: Date | null;
  playCount: number | null;
  likeCount: number | null;
  commentCount: number | null;
  collectCount: number | null;
  shareCount: number | null;
}

export interface EngagementSyncInput {
  ownerId: string;
  account: string;
  accountFile: string;
  title: string;
  publishedAt: Date;
  workUrl?: string;
  publishKind?: 'video' | 'note';
}

export interface AccountEngagementResult {
  account: string;
  stat: WorkStat;
  workLink?: WorkLink | null;
}

export type EngagementPlatform = WorkLinkPlatform;
