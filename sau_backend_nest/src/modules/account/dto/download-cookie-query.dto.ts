import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class DownloadCookieQueryDto {
  @ApiProperty({
    example: 'account_uuid.json',
    description: 'Cookie 文件名，来自 getAccounts 返回的 filePath 字段',
  })
  @IsString()
  filePath: string;
}
