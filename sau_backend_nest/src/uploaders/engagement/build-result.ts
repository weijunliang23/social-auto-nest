import { basename } from 'path';
import type { WorkStat } from '../../database/schemas/publish-record.schema';
import type { WorkLink } from '../work-link';
import type { WorkLinkPlatform } from '../capture-work-link';
import type { AccountEngagementResult } from './engagement.types';
import type { WorkMatchResult } from './match-work';
import { publicWorkUrl } from './work-identity';

export function toAccountResult(
  account: string,
  accountFile: string,
  platform: WorkLinkPlatform,
  matched: WorkMatchResult,
): AccountEngagementResult {
  const now = new Date();
  if (!matched.work) {
    const stat: WorkStat = {
      account,
      play_count: null,
      like_count: null,
      comment_count: null,
      collect_count: null,
      share_count: null,
      match: 'unmatched',
      synced_at: now,
    };
    return { account, stat, workLink: null };
  }

  const work = matched.work;
  const stat: WorkStat = {
    account,
    play_count: work.playCount,
    like_count: work.likeCount,
    comment_count: work.commentCount,
    collect_count: work.collectCount,
    share_count: work.shareCount,
    match: matched.match === 'unmatched' ? 'unmatched' : matched.match,
    synced_at: now,
  };

  let workLink: WorkLink | null = null;
  if (work.id) {
    workLink = {
      account: basename(accountFile),
      url: publicWorkUrl(platform, work.id),
      kind: 'public',
    };
  }
  return { account, stat, workLink };
}
