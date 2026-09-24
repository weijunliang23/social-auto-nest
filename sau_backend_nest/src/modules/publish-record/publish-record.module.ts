import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ENGAGEMENT_SYNC_QUEUE_NAME } from '../../queue/engagement-sync.queue';
import { PUBLISH_QUEUE_NAME } from '../../queue/publish.queue';
import { AccountModule } from '../account/account.module';
import { MaterialModule } from '../material/material.module';
import { PublishRecordController } from './publish-record.controller';
import { PublishRecordService } from './publish-record.service';

/** 发布记录查询与删除模块 */
@Module({
  imports: [
    AccountModule,
    MaterialModule,
    BullModule.registerQueue({ name: PUBLISH_QUEUE_NAME }),
    BullModule.registerQueue({ name: ENGAGEMENT_SYNC_QUEUE_NAME }),
  ],
  controllers: [PublishRecordController],
  providers: [PublishRecordService],
  exports: [PublishRecordService],
})
export class PublishRecordModule {}
