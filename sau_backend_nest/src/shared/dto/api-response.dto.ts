import { ApiProperty } from '@nestjs/swagger';

export class ApiResponseDto {
  @ApiProperty({ example: 200, description: '业务状态码，200 表示成功' })
  code: number;

  @ApiProperty({
    example: null,
    nullable: true,
    description: '错误或提示信息',
  })
  msg: string | null;

  @ApiProperty({ description: '响应数据', nullable: true })
  data: unknown;
}

export class HealthDataDto {
  @ApiProperty({ example: 5409, description: '服务监听端口' })
  port: number;

  @ApiProperty({ example: true, description: 'Chrome 是否无头模式' })
  localChromeHeadless: boolean;

  @ApiProperty({ example: true, description: '是否开启调试模式' })
  debugMode: boolean;

  @ApiProperty({ example: 'redis://127.0.0.1:6379', description: 'Redis 连接地址' })
  redisUrl: string;
}

export class HealthResponseDto extends ApiResponseDto {
  @ApiProperty({ type: HealthDataDto })
  declare data: HealthDataDto;
}
