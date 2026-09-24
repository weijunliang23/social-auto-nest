import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { GetPublishRecordQueryDto } from './get-publish-record-query.dto';

export class RetryPublishRecordQueryDto extends GetPublishRecordQueryDto {
  @ApiPropertyOptional({
    example: 'true',
    description: '传 true 或 1 时以有头浏览器（可视化）重试，并写入 extra_config.browserPublish',
  })
  @IsOptional()
  @IsString()
  browserPublish?: string;
}
