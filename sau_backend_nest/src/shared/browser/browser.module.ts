import { Global, Module } from '@nestjs/common';
import { BrowserService } from './browser.service';

/** 全局浏览器模块，供登录与 cookie 校验共用 */
@Global()
@Module({
  providers: [BrowserService],
  exports: [BrowserService],
})
export class BrowserModule {}
