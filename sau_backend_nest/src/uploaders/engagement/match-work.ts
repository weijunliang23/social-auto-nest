import type { CreatorWork } from './engagement.types';
import { titlesSimilar, withinTimeWindow } from './work-identity';

export type WorkMatchKind = 'id' | 'title' | 'unmatched';

export interface WorkMatchResult {
  work: CreatorWork | null;
  match: WorkMatchKind;
  message?: string;
}

export function matchCreatorWork(
  works: CreatorWork[],
  opts: { workId?: string | null; title: string; publishedAt: Date },
): WorkMatchResult {
  if (opts.workId) {
    const byId = works.filter((item) => item.id === opts.workId);
    if (byId.length === 1) {
      return { work: byId[0], match: 'id' };
    }
    if (byId.length > 1) {
      return {
        work: null,
        match: 'unmatched',
        message: '按作品 ID 匹配到多条，请人工核对',
      };
    }
  }

  const byTitle = works.filter(
    (item) =>
      titlesSimilar(item.title, opts.title) &&
      withinTimeWindow(item.publishedAt, opts.publishedAt),
  );
  if (byTitle.length === 1) {
    return { work: byTitle[0], match: 'title' };
  }
  if (byTitle.length > 1) {
    return {
      work: null,
      match: 'unmatched',
      message: '按标题匹配到多条作品，请人工核对',
    };
  }
  return {
    work: null,
    match: 'unmatched',
    message: opts.workId
      ? '作品列表中未找到对应 ID，且标题未唯一匹配'
      : '作品列表中未匹配到标题，可稍后重试或核对发布是否已公开',
  };
}
