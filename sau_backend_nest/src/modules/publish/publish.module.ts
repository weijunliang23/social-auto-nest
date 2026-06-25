import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { PUBLISH_QUEUE_NAME } from '../../queue/publish.queue';
import { AccountModule } from '../account/account.module';
import { MaterialModule } from '../material/material.module';
import { PublishRecordModule } from '../publish-record/publish-record.module';
import { PublishController } from './publish.controller';
import { PublishService } from './publish.service';

@Module({
  imports: [
    PublishRecordModule,
    AccountModule,
    MaterialModule,
    BullModule.registerQueue({ name: PUBLISH_QUEUE_NAME }),
  ],
  controllers: [PublishController],
  providers: [PublishService],
})
export class PublishModule {}
