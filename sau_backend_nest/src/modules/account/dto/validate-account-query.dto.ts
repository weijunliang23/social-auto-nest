import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class ValidateAccountQueryDto {
  @ApiProperty({
    example: 'e600f1a8-34d5-4f78-9dc9-1f38203044c8',
    description: '账号 ID，来自 getAccounts 返回',
  })
  @IsString()
  id: string;

  @ApiPropertyOptional({
    example: '1',
    description: '传 true 或 1 时强制重新校验，忽略 1 小时缓存',
  })
  @IsOptional()
  @IsString()
  force?: string;
}
