/** 视频号发布页 URL */
export const TENCENT_PUBLISH_URL =
  'https://channels.weixin.qq.com/platform/post/create';

export const TENCENT_PUBLISH_URL_PATTERN =
  'https://channels.weixin.qq.com/platform/post/create';

export const TENCENT_POST_LIST_URL =
  'https://channels.weixin.qq.com/platform/post/list';

export const TENCENT_POST_LIST_URL_PATTERN = '**/post/list**';

/** 移植 utils/constant.py TencentZoneTypes */
export const TENCENT_ZONE_TYPES = [
  '生活',
  '萌娃',
  '音乐',
  '知识',
  '情感',
  '旅行风景',
  '时尚',
  '美食',
  '生活技巧',
  '舞蹈',
  '影视综艺',
  '运动',
  '搞笑',
  '明星名人',
  '新闻资讯',
  '游戏',
  '车',
  '二次元',
  '才艺',
  '萌宠',
  '机械',
  '动物',
  '育儿',
  '科技',
] as const;

/** 将 API category 数字映射为原创类型中文标签；null/0 返回 null */
export function resolveTencentCategory(
  category: number | null | undefined,
): string | null {
  if (category == null || category === 0) {
    return null;
  }
  const idx = category - 1;
  if (idx >= 0 && idx < TENCENT_ZONE_TYPES.length) {
    return TENCENT_ZONE_TYPES[idx];
  }
  return null;
}

/** 移植 format_str_for_short_title */
export function formatStrForShortTitle(originTitle: string): string {
  const allowedSpecialChars = '《》"":+?%°';
  const filteredChars = [...originTitle].map((char) => {
    if (/[a-zA-Z0-9\u4e00-\u9fff]/.test(char) || allowedSpecialChars.includes(char)) {
      return char;
    }
    if (char === ',') {
      return ' ';
    }
    return '';
  });
  let formatted = filteredChars.join('');
  if (formatted.length > 16) {
    formatted = formatted.slice(0, 16);
  } else if (formatted.length < 6) {
    formatted += ' '.repeat(6 - formatted.length);
  }
  return formatted;
}
