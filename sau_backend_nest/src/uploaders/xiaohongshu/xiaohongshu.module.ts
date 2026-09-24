import { Module } from '@nestjs/common';
import { AccountModule } from '../../modules/account/account.module';
import { BrowserModule } from '../../shared/browser/browser.module';
import { XiaohongshuEngagementSync } from './xiaohongshu-engagement.sync';
import { XiaohongshuPublishService } from './xiaohongshu-publish.service';

@Module({
  imports: [BrowserModule, AccountModule],
  providers: [XiaohongshuPublishService, XiaohongshuEngagementSync],
  exports: [XiaohongshuPublishService, XiaohongshuEngagementSync],
})
export class XiaohongshuModule {}
