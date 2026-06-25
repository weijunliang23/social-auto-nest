import { Module } from '@nestjs/common';
import { AccountModule } from '../../modules/account/account.module';
import { BrowserModule } from '../../shared/browser/browser.module';
import { XiaohongshuPublishService } from './xiaohongshu-publish.service';

@Module({
  imports: [BrowserModule, AccountModule],
  providers: [XiaohongshuPublishService],
  exports: [XiaohongshuPublishService],
})
export class XiaohongshuModule {}
