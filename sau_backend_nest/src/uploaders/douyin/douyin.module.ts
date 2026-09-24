import { Module } from '@nestjs/common';
import { AccountModule } from '../../modules/account/account.module';
import { BrowserModule } from '../../shared/browser/browser.module';
import { DouyinEngagementSync } from './douyin-engagement.sync';
import { DouyinPublishService } from './douyin-publish.service';

@Module({
  imports: [BrowserModule, AccountModule],
  providers: [DouyinPublishService, DouyinEngagementSync],
  exports: [DouyinPublishService, DouyinEngagementSync],
})
export class DouyinModule {}
