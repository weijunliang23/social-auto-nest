import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class UploadCookieDto {
  @ApiProperty({
    type: 'string',
    format: 'binary',
    description: 'Cookie JSON 文件',
  })
  file: Express.Multer.File;

  @ApiPropertyOptional({
    example: '1',
    description: '账号 ID，来自 getAccounts 返回',
  })
  @IsOptional()
  @IsString()
  id?: string;

  @ApiPropertyOptional({
    example: '3',
    description: '平台类型：1 小红书 / 2 视频号 / 3 抖音 / 4 快手',
  })
  @IsOptional()
  @IsString()
  platform?: string;
}
