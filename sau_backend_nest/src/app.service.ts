import { Inject, Injectable } from '@nestjs/common';
import type { AppConfig } from './config/app-config.interface';
import appConfig from './config/app.config';

@Injectable()
export class AppService {
  constructor(
    @Inject(appConfig.KEY)
    private readonly app: AppConfig,
  ) {}

  getHealth() {
    return {
      code: 200,
      msg: 'sau_backend_nest Phase 0 ready',
      data: {
        port: this.app.port,
        localChromeHeadless: this.app.localChromeHeadless,
        debugMode: this.app.debugMode,
        redisUrl: this.app.redisUrl,
      },
    };
  }
}
