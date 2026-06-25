import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class DeletePublishRecordQueryDto {
  @ApiProperty({
    example: '1',
    description: '发布记录 ID，来自 getPublishRecords 返回',
  })
  @IsString()
  id: string;
}
