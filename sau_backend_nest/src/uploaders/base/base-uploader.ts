import { existsSync, statSync } from 'fs';
import { resolve } from 'path';

/** 移植 uploader/base_video.py */
export class BaseUploader {
  static readonly SUPPORTED_VIDEO_EXTENSIONS = new Set([
    '.mp4',
    '.mov',
    '.avi',
    '.mkv',
    '.m4v',
    '.webm',
    '.flv',
    '.wmv',
  ]);

  static readonly SUPPORTED_IMAGE_EXTENSIONS = new Set([
    '.jpg',
    '.jpeg',
    '.png',
    '.webp',
    '.bmp',
  ]);

  static readonly MIN_SCHEDULE_LEAD_MS = 2 * 60 * 60 * 1000;

  static validateVideoFile(filePath: string): string {
    const path = resolve(filePath);
    if (!existsSync(path)) {
      throw new Error(`视频文件不存在: ${path}`);
    }
    if (!statSync(path).isFile()) {
      throw new Error(`视频路径不是文件: ${path}`);
    }
    const ext = path.slice(path.lastIndexOf('.')).toLowerCase();
    if (!BaseUploader.SUPPORTED_VIDEO_EXTENSIONS.has(ext)) {
      throw new Error(
        `不支持的视频格式: ${ext}，当前支持: ${[...BaseUploader.SUPPORTED_VIDEO_EXTENSIONS].sort().join(', ')}`,
      );
    }
    return path;
  }

  static validateImageFile(filePath: string): string {
    const path = resolve(filePath);
    if (!existsSync(path)) {
      throw new Error(`图片文件不存在: ${path}`);
    }
    if (!statSync(path).isFile()) {
      throw new Error(`图片路径不是文件: ${path}`);
    }
    const ext = path.slice(path.lastIndexOf('.')).toLowerCase();
    if (!BaseUploader.SUPPORTED_IMAGE_EXTENSIONS.has(ext)) {
      throw new Error(
        `不支持的图片格式: ${ext}，当前支持: ${[...BaseUploader.SUPPORTED_IMAGE_EXTENSIONS].sort().join(', ')}`,
      );
    }
    return path;
  }

  static validatePublishDate(publishDate: Date | number | null | undefined): Date | 0 {
    if (publishDate === null || publishDate === undefined || publishDate === 0) {
      return 0;
    }
    if (!(publishDate instanceof Date)) {
      throw new TypeError('publish_date 必须是 Date 类型或 0');
    }
    const now = new Date();
    if (publishDate.getTime() <= now.getTime()) {
      throw new Error('定时发布时间必须晚于当前时间');
    }
    const minPublishTime = new Date(now.getTime() + BaseUploader.MIN_SCHEDULE_LEAD_MS);
    if (publishDate.getTime() <= minPublishTime.getTime()) {
      throw new Error('定时发布时间必须大于当前时间 2 小时');
    }
    return publishDate;
  }
}
