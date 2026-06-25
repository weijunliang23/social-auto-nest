import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { PUBLISH_QUEUE_NAME } from '../../queue/publish.queue';
import { PublishRecordController } from './publish-record.controller';
import { PublishRecordService } from './publish-record.service';

/** 发布记录查询与删除模块 */
@Module({
  imports: [BullModule.registerQueue({ name: PUBLISH_QUEUE_NAME })],
  controllers: [PublishRecordController],
  providers: [PublishRecordService],
  exports: [PublishRecordService],
})
export class PublishRecordModule {}
