import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class UploadSaveDto {
  @ApiProperty({
    type: 'string',
    format: 'binary',
    description: '视频文件，最大 160MB',
  })
  file: Express.Multer.File;

  @ApiPropertyOptional({
    example: 'my_custom_name',
    description: '自定义文件名（不含扩展名），不传则使用原始文件名',
  })
  @IsOptional()
  @IsString()
  filename?: string;
}
