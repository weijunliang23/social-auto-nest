import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class LoginQueryDto {
  @ApiProperty({
    example: '3',
    description: '平台类型：1 小红书 / 2 视频号 / 3 抖音 / 4 快手',
  })
  @IsString()
  type: string;

  @ApiProperty({
    example: 'test_douyin',
    description: '账号名称（唯一标识，用于保存 Cookie 文件）',
  })
  @IsString()
  id: string;

  @ApiPropertyOptional({
    example: 'true',
    description:
      '是否强制有头浏览器登录。传 true 或 1 时弹出 Chrome 窗口；不传则走全局 localChromeHeadless 配置',
  })
  @IsOptional()
  @IsString()
  browserLogin?: string;
}
