import { Module } from '@nestjs/common';
import { AccountModule } from '../../modules/account/account.module';
import { BrowserModule } from '../../shared/browser/browser.module';
import { TencentPublishService } from './tencent-publish.service';

@Module({
  imports: [BrowserModule, AccountModule],
  providers: [TencentPublishService],
  exports: [TencentPublishService],
})
export class TencentModule {}
