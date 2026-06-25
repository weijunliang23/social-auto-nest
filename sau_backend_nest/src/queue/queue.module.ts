import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import type { AppConfig } from '../config/app-config.interface';
import appConfig from '../config/app.config';
import { PublishRecordModule } from '../modules/publish-record/publish-record.module';
import { DouyinModule } from '../uploaders/douyin/douyin.module';
import { KuaishouModule } from '../uploaders/kuaishou/kuaishou.module';
import { TencentModule } from '../uploaders/tencent/tencent.module';
import { XiaohongshuModule } from '../uploaders/xiaohongshu/xiaohongshu.module';
import { PublishProcessor } from './publish.processor';
import { PUBLISH_QUEUE_NAME } from './publish.queue';

@Module({
  imports: [
    BullModule.forRootAsync({
      inject: [appConfig.KEY],
      useFactory: (config: AppConfig) => ({
        connection: {
          url: config.redisUrl,
        },
      }),
    }),
    BullModule.registerQueue({
      name: PUBLISH_QUEUE_NAME,
    }),
    PublishRecordModule,
    DouyinModule,
    KuaishouModule,
    XiaohongshuModule,
    TencentModule,
  ],
  providers: [PublishProcessor],
})
export class QueueModule {}
