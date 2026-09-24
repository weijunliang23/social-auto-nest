import { Inject, Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';
import { randomUUID } from 'crypto';
import type { AppConfig } from '../../config/app-config.interface';
import appConfig from '../../config/app.config';

const LOCK_TTL_MS = 60 * 60 * 1000;
const RETRY_MS = 2000;
const RELEASE_LUA = `
if redis.call("get", KEYS[1]) == ARGV[1] then
  return redis.call("del", KEYS[1])
end
return 0
`;

export const COOKIE_ERROR_HINT = '账号登录已失效，请到账号管理复验 Cookie';
export const ACCOUNT_BUSY_HINT = '账号正在发布或刷新数据，请稍后再试';

/** 同一 Cookie 文件同时只允许发布或刷新其一，避免 storageState 互踩 */
@Injectable()
export class AccountCookieLockService implements OnModuleDestroy {
  private readonly logger = new Logger(AccountCookieLockService.name);
  private readonly redis: Redis;

  constructor(
    @Inject(appConfig.KEY)
    app: AppConfig,
  ) {
    this.redis = new Redis(app.redisUrl, {
      maxRetriesPerRequest: null,
      lazyConnect: false,
    });
    this.redis.on('error', (err) => {
      this.logger.warn(`Redis lock error: ${err.message}`);
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.redis.quit().catch(() => undefined);
  }

  async withAccountLocks<T>(
    ownerId: string,
    accounts: string[],
    fn: () => Promise<T>,
    waitMs = 8 * 60 * 1000,
  ): Promise<T> {
    const unique = [...new Set(accounts.filter(Boolean))].sort();
    if (!unique.length) {
      return fn();
    }
    const keys = unique.map((account) => this.lockKey(ownerId, account));
    const tokens = await this.acquireAll(keys, waitMs);
    try {
      return await fn();
    } finally {
      await this.releaseAll(keys, tokens);
    }
  }

  private lockKey(ownerId: string, account: string): string {
    return `sau:cookie-lock:${ownerId}:${account}`;
  }

  private async acquireAll(keys: string[], waitMs: number): Promise<string[]> {
    const tokens: string[] = [];
    try {
      for (const key of keys) {
        const token = randomUUID();
        const deadline = Date.now() + waitMs;
        while (true) {
          const ok = await this.redis.set(key, token, 'PX', LOCK_TTL_MS, 'NX');
          if (ok === 'OK') {
            tokens.push(token);
            break;
          }
          if (Date.now() >= deadline) {
            throw new Error(ACCOUNT_BUSY_HINT);
          }
          await sleep(RETRY_MS);
        }
      }
      return tokens;
    } catch (e) {
      await this.releaseAll(keys.slice(0, tokens.length), tokens);
      throw e;
    }
  }

  private async releaseAll(keys: string[], tokens: string[]): Promise<void> {
    for (let i = 0; i < keys.length; i++) {
      try {
        await this.redis.eval(RELEASE_LUA, 1, keys[i], tokens[i]);
      } catch (e) {
        this.logger.warn(
          `释放账号锁失败 ${keys[i]}: ${e instanceof Error ? e.message : String(e)}`,
        );
      }
    }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
