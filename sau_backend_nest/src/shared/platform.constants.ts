/** Web 平台 type 字符串（与 Flask / 前端 query 参数一致） */
export const MEDIA_XHS = '1';
export const MEDIA_TENCENT = '2';
export const MEDIA_DOUYIN = '3';
export const MEDIA_KUAISHOU = '4';

/** Web 平台 type 数值（写入 user_info.type） */
export const MEDIA_TYPE = {
  XHS: 1,
  TENCENT: 2,
  DOUYIN: 3,
  KUAISHOU: 4,
} as const;
