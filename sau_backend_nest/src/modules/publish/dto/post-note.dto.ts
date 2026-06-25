import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  Allow,
  ArrayNotEmpty,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
} from 'class-validator';

export class PostNoteDto {
  @ApiProperty({
    example: 3,
    description: '平台类型：1=小红书，3=抖音，4=快手；2=视频号不支持图文',
  })
  @Type(() => Number)
  @IsInt()
  type: number;

  @ApiProperty({ example: '图文标题' })
  @IsString()
  title: string;

  @ApiPropertyOptional({ example: '正文内容' })
  @IsOptional()
  @IsString()
  note?: string;

  @ApiPropertyOptional({ example: ['话题1'], type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiProperty({
    example: ['a.jpg', 'b.jpg'],
    description: 'videoFile 目录下的图片文件名列表',
    type: [String],
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  fileList: string[];

  @ApiProperty({
    example: ['account.json'],
    type: [String],
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  accountList: string[];

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @Allow()
  enableTimer?: boolean | number;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  videosPerDay?: number;

  @ApiPropertyOptional({ example: ['10:00'], type: [String] })
  @IsOptional()
  @IsArray()
  dailyTimes?: (string | number)[];

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  startDays?: number;

  @ApiPropertyOptional({
    example: false,
    description: 'true 时有头浏览器可视化发布',
  })
  @IsOptional()
  @Allow()
  browserPublish?: boolean;
}
