import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { Transform } from 'class-transformer';

export class GetFileQueryDto {
  @ApiProperty({
    example: 'UUID_my_video.mp4',
    description: '磁盘存储文件名，来自 uploadSave 返回的 data.filepath',
  })
  @IsString()
  filename: string;

  @ApiPropertyOptional({
    example: '1',
    description: '传 1 或 true 时以附件形式下载，否则 inline 预览',
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => (value === undefined || value === null ? undefined : String(value)))
  download?: string;
}
