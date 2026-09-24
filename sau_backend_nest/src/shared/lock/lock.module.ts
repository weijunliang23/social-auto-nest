import { Global, Module } from '@nestjs/common';
import { AccountCookieLockService } from './account-cookie-lock.service';

@Global()
@Module({
  providers: [AccountCookieLockService],
  exports: [AccountCookieLockService],
})
export class LockModule {}
