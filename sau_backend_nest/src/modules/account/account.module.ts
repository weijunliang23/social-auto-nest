import { Module } from '@nestjs/common';
import { AccountController } from './account.controller';
import { AccountService } from './account.service';
import { AuthService } from './auth.service';
import { LoginService } from './login.service';

/** 社交平台账号管理模块（含 SSE 扫码登录与 cookie 校验） */
@Module({
  controllers: [AccountController],
  providers: [AccountService, AuthService, LoginService],
  exports: [AccountService, AuthService],
})
export class AccountModule {}
