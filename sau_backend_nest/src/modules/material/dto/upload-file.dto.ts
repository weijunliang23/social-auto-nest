import { ApiProperty } from '@nestjs/swagger';

export class UploadFileDto {
  @ApiProperty({
    type: 'string',
    format: 'binary',
    description: '视频文件，最大 160MB',
  })
  file: Express.Multer.File;
}
