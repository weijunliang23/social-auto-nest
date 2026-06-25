/** BullMQ 发布任务 payload，对齐 Flask postVideo/postNote JSON */
export interface PublishJobPayload {
  recordId: string;
  ownerId: string;
  kind: 'video' | 'note';
  platformType: number;
  title: string;
  tags?: string[];
  fileList: string[];
  accountList: string[];
  note?: string;
  enableTimer?: boolean | number;
  videosPerDay?: number;
  dailyTimes?: (string | number)[];
  startDays?: number;
  productLink?: string;
  productTitle?: string;
  thumbnail?: string;
  category?: number | null;
  isDraft?: boolean;
  browserPublish?: boolean;
}
