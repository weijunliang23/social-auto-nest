import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class GetPublishRecordQueryDto {
  @ApiProperty({
    example: '507f1f77bcf86cd799439011',
    description: '发布记录 ID，来自 postVideo/postNote 返回的 recordId',
  })
  @IsString()
  id: string;
}
