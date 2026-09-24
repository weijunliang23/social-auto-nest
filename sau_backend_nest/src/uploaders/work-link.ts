export type WorkLinkKind = 'public' | 'creator';

/** 一条已发布作品的可打开地址，按账号（视频再按文件）存储 */
export interface WorkLink {
  account: string;
  file?: string;
  url: string;
  kind: WorkLinkKind;
}

export function withAccount(
  link: WorkLink,
  account: string,
  file?: string,
): WorkLink {
  const next: WorkLink = {
    account,
    url: link.url,
    kind: link.kind,
  };
  if (file) {
    next.file = file;
  }
  return next;
}
