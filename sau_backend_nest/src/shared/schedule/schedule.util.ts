/** 移植 utils/files_times.py + myUtils/postNote.py 定时逻辑 */

export function generateScheduleTimeNextDay(
  totalVideos: number,
  videosPerDay = 1,
  dailyTimes?: (string | number)[] | null,
  startDays = 0,
): Date[] {
  if (videosPerDay <= 0) {
    throw new Error('videos_per_day should be a positive integer');
  }

  const normalizedHours = normalizeDailyTimesHours(dailyTimes);
  if (videosPerDay > normalizedHours.length) {
    throw new Error('videos_per_day should not exceed the length of daily_times');
  }

  const schedule: Date[] = [];
  const currentTime = new Date();

  for (let video = 0; video < totalVideos; video++) {
    const day = Math.floor(video / videosPerDay) + startDays + 1;
    const dailyVideoIndex = video % videosPerDay;
    const hour = normalizedHours[dailyVideoIndex];

    const timestamp = new Date(currentTime);
    timestamp.setDate(timestamp.getDate() + day);
    timestamp.setHours(hour, 0, 0, 0);
    schedule.push(timestamp);
  }

  return schedule;
}

export function normalizeDailyTimesHours(
  dailyTimes?: (string | number)[] | null,
): number[] {
  if (!dailyTimes?.length) {
    return [10];
  }
  const out: number[] = [];
  for (const t of dailyTimes) {
    if (t === null || t === undefined) {
      continue;
    }
    if (typeof t === 'string' && t.includes(':')) {
      out.push(parseInt(t.split(':', 1)[0], 10));
    } else {
      out.push(Number(t));
    }
  }
  return out.length ? out : [10];
}

export function resolvePublishDate(
  enableTimer: boolean | number | undefined,
  videosPerDay: number | undefined,
  dailyTimes: (string | number)[] | undefined,
  startDays: number | undefined,
): Date | 0 {
  if (!enableTimer) {
    return 0;
  }
  const vpd =
    videosPerDay && Number(videosPerDay) > 0 ? Number(videosPerDay) : 1;
  const slots = normalizeDailyTimesHours(dailyTimes);
  const times = generateScheduleTimeNextDay(1, vpd, slots, startDays ?? 0);
  return times[0];
}
