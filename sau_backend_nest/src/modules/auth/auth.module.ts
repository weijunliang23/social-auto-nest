import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AppAuthService } from './app-auth.service';
import { AuthController } from './auth.controller';
import { AuthGuard } from './auth.guard';

@Module({
  controllers: [AuthController],
  providers: [
    AppAuthService,
    AuthGuard,
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
  ],
  exports: [AppAuthService, AuthGuard],
})
export class AuthModule {}
