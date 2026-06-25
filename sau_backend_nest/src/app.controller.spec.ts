import { Test, TestingModule } from '@nestjs/testing';
import appConfig from './config/app.config';
import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        AppService,
        {
          provide: appConfig.KEY,
          useValue: {
            port: 5409,
            localChromeHeadless: true,
            debugMode: true,
            redisUrl: 'redis://127.0.0.1:6379',
            baseDir: '/tmp',
            localChromePath: '',
            xhsServer: 'http://127.0.0.1:11901',
          },
        },
      ],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('root', () => {
    it('should return phase 0 health payload', () => {
      expect(appController.health()).toEqual({
        code: 200,
        msg: 'sau_backend_nest Phase 0 ready',
        data: {
          port: 5409,
          localChromeHeadless: true,
          debugMode: true,
          redisUrl: 'redis://127.0.0.1:6379',
        },
      });
    });
  });
});
