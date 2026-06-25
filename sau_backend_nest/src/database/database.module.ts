import { Global, Inject, Injectable, Logger, Module, OnModuleInit } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import type { AppConfig } from '../config/app-config.interface';
import appConfig from '../config/app.config';
import {
  AppSession,
  AppSessionSchema,
  AppUser,
  AppUserSchema,
  Material,
  MaterialSchema,
  PlatformAccount,
  PlatformAccountSchema,
  PublishRecord,
  PublishRecordSchema,
} from './schemas';

@Global()
@Module({
  imports: [
    MongooseModule.forRootAsync({
      inject: [appConfig.KEY],
      useFactory: (config: AppConfig) => ({
        uri: config.mongodbUrl,
      }),
    }),
    MongooseModule.forFeature([
      { name: AppUser.name, schema: AppUserSchema },
      { name: AppSession.name, schema: AppSessionSchema },
      { name: PlatformAccount.name, schema: PlatformAccountSchema },
      { name: Material.name, schema: MaterialSchema },
      { name: PublishRecord.name, schema: PublishRecordSchema },
    ]),
  ],
  exports: [MongooseModule],
})
export class DatabaseModule implements OnModuleInit {
  private readonly logger = new Logger(DatabaseModule.name);

  constructor(
    @Inject(appConfig.KEY)
    private readonly app: AppConfig,
  ) {}

  onModuleInit(): void {
    const usersRoot = join(this.app.baseDir, 'users');
    if (!existsSync(usersRoot)) {
      mkdirSync(usersRoot, { recursive: true });
      this.logger.log(`Created directory: ${usersRoot}`);
    }
  }
}
