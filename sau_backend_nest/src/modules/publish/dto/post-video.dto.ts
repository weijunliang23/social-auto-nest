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

export class PostVideoDto {
  @ApiProperty({
    example: 3,
    description: '平台类型：1=小红书，2=视频号，3=抖音，4=快手',
  })
  @Type(() => Number)
  @IsInt()
  type: number;

  @ApiProperty({ example: '视频标题' })
  @IsString()
  title: string;

  @ApiPropertyOptional({ example: ['话题1', '话题2'], type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiProperty({
    example: ['uuid_video.mp4'],
    description: 'videoFile 目录下的文件名列表',
    type: [String],
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  fileList: string[];

  @ApiProperty({
    example: ['account.json'],
    description: 'cookiesFile 目录下的 cookie 文件名列表',
    type: [String],
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  accountList: string[];

  @ApiPropertyOptional({
    example: 0,
    description:
      '分类，0 表示 null；视频号用于原创类型（1-based 索引映射 TencentZoneTypes）',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  category?: number;

  @ApiPropertyOptional({ example: 0, description: '0=立即发布，1=定时发布' })
  @IsOptional()
  @Allow()
  enableTimer?: boolean | number;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  videosPerDay?: number;

  @ApiPropertyOptional({ example: ['10:00', '14:00'], type: [String] })
  @IsOptional()
  @IsArray()
  dailyTimes?: (string | number)[];

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  startDays?: number;

  @ApiPropertyOptional({ example: '', description: '抖音商品链接' })
  @IsOptional()
  @IsString()
  productLink?: string;

  @ApiPropertyOptional({ example: '', description: '抖音商品短标题' })
  @IsOptional()
  @IsString()
  productTitle?: string;

  @ApiPropertyOptional({
    example: '',
    description: '封面路径（videoFile 下），抖音/快手/小红书均支持',
  })
  @IsOptional()
  @IsString()
  thumbnail?: string;

  @ApiPropertyOptional({ example: false, description: '是否草稿（视频号专用）' })
  @IsOptional()
  @Allow()
  isDraft?: boolean;

  @ApiPropertyOptional({
    example: false,
    description: 'true 时有头浏览器可视化发布',
  })
  @IsOptional()
  @Allow()
  browserPublish?: boolean;
}
