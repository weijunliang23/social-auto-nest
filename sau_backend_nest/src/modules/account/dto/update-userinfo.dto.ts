import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString } from 'class-validator';

export class UpdateUserinfoDto {
  @ApiPropertyOptional({
    example: 'e600f1a8-34d5-4f78-9dc9-1f38203044c8',
    description: '账号 ID，来自 getAccounts 返回',
  })
  @IsOptional()
  @IsString()
  id?: string;

  @ApiPropertyOptional({
    example: 3,
    description: '平台类型：1 小红书 / 2 视频号 / 3 抖音 / 4 快手',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  type?: number;

  @ApiPropertyOptional({ example: '我的抖音号', description: '账号显示名称' })
  @IsOptional()
  @IsString()
  userName?: string;
}
