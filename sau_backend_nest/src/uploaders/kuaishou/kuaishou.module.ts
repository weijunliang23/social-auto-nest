import { Module } from '@nestjs/common';
import { AccountModule } from '../../modules/account/account.module';
import { BrowserModule } from '../../shared/browser/browser.module';
import { KuaishouEngagementSync } from './kuaishou-engagement.sync';
import { KuaishouPublishService } from './kuaishou-publish.service';

@Module({
  imports: [BrowserModule, AccountModule],
  providers: [KuaishouPublishService, KuaishouEngagementSync],
  exports: [KuaishouPublishService, KuaishouEngagementSync],
})
export class KuaishouModule {}
