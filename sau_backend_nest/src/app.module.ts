import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AppConfigModule } from './config/config.module';
import { DatabaseModule } from './database/database.module';
import { AccountModule } from './modules/account/account.module';
import { AuthModule } from './modules/auth/auth.module';
import { MaterialModule } from './modules/material/material.module';
import { PublishModule } from './modules/publish/publish.module';
import { PublishRecordModule } from './modules/publish-record/publish-record.module';
import { QueueModule } from './queue/queue.module';
import { BrowserModule } from './shared/browser/browser.module';

@Module({
  imports: [
    AppConfigModule,
    DatabaseModule,
    AuthModule,
    BrowserModule,
    QueueModule,
    MaterialModule,
    AccountModule,
    PublishRecordModule,
    PublishModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
