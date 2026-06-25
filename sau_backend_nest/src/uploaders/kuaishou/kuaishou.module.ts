import { Module } from '@nestjs/common';
import { AccountModule } from '../../modules/account/account.module';
import { BrowserModule } from '../../shared/browser/browser.module';
import { KuaishouPublishService } from './kuaishou-publish.service';

@Module({
  imports: [BrowserModule, AccountModule],
  providers: [KuaishouPublishService],
  exports: [KuaishouPublishService],
})
export class KuaishouModule {}
