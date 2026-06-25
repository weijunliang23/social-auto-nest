import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class DeleteFileQueryDto {
  @ApiProperty({ example: '1', description: '素材记录 ID，来自 getFiles 返回' })
  @IsString()
  id: string;
}
