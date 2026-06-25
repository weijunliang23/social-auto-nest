import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class ValidateAccountsQueryDto {
  @ApiPropertyOptional({
    example: '1',
    description: '传 true 或 1 时强制重新校验全部账号，忽略 1 小时缓存',
  })
  @IsOptional()
  @IsString()
  force?: string;
}
