import { registerAs } from '@nestjs/config';
import { appConfig as localAppConfig } from '../../conf';
import { defaultAppConfig } from '../../conf.example';
import type { AppConfig } from './app-config.interface';

function parseEnvBool(value: string | undefined): boolean | undefined {
  if (value === undefined) {
    return undefined;
  }
  return value.toLowerCase() === 'true';
}

const appConfig = registerAs('app', (): AppConfig => {
  const merged: AppConfig = {
    ...defaultAppConfig,
    ...localAppConfig,
  };

  return {
    baseDir: process.env.BASE_DIR ?? merged.baseDir,
    localChromePath: process.env.LOCAL_CHROME_PATH ?? merged.localChromePath,
    localChromeHeadless:
      parseEnvBool(process.env.LOCAL_CHROME_HEADLESS) ??
      merged.localChromeHeadless,
    debugMode: parseEnvBool(process.env.DEBUG_MODE) ?? merged.debugMode,
    port: process.env.PORT ? Number(process.env.PORT) : merged.port,
    redisUrl: process.env.REDIS_URL ?? merged.redisUrl,
    mongodbUrl: process.env.MONGODB_URL ?? merged.mongodbUrl,
    xhsServer: process.env.XHS_SERVER ?? merged.xhsServer,
  };
});

export default appConfig;
