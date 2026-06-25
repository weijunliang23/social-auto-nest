import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class GetPublishRecordsQueryDto {
  @ApiPropertyOptional({
    example: '3',
    description: '平台类型：1 小红书 / 2 视频号 / 3 抖音 / 4 快手',
  })
  @IsOptional()
  @IsString()
  platform?: string;

  @ApiPropertyOptional({
    example: 'video',
    description: '内容类型：video（视频）或 note（图文）',
    enum: ['video', 'note'],
  })
  @IsOptional()
  @IsString()
  kind?: string;

  @ApiPropertyOptional({
    example: 'success',
    description:
      '发布状态：queued、running、success、failed、cancelled；不传时默认排除 cancelled',
  })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({
    example: '测试',
    description: '标题关键词模糊搜索',
  })
  @IsOptional()
  @IsString()
  keyword?: string;

  @ApiPropertyOptional({
    example: '1',
    description: '页码，从 1 开始，默认 1',
  })
  @IsOptional()
  @IsString()
  page?: string;

  @ApiPropertyOptional({
    example: '20',
    description: '每页条数，范围 1–500，默认 20',
  })
  @IsOptional()
  @IsString()
  limit?: string;
}
