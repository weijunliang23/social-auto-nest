import { join } from 'path';
import type { AppConfig } from './src/config/app-config.interface';

/**
 * 默认配置（等价 conf.example.py）。
 * 复制为 conf.ts 后可本地覆盖；conf.ts 已加入 .gitignore。
 */
export const defaultAppConfig: AppConfig = {
  baseDir: join(__dirname, '..', '..'),
  localChromePath: '',
  localChromeHeadless: true,
  debugMode: true,
  port: 5409,
  redisUrl: 'redis://127.0.0.1:6379',
  mongodbUrl:
    'mongodb://admin:123456@127.0.0.1:27017/sau?authSource=admin',
  xhsServer: 'http://127.0.0.1:11901',
};
