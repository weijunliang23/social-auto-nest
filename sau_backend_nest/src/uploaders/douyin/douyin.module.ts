import { Module } from '@nestjs/common';
import { AccountModule } from '../../modules/account/account.module';
import { BrowserModule } from '../../shared/browser/browser.module';
import { DouyinPublishService } from './douyin-publish.service';

@Module({
  imports: [BrowserModule, AccountModule],
  providers: [DouyinPublishService],
  exports: [DouyinPublishService],
})
export class DouyinModule {}
