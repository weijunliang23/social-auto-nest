import { ApiProperty } from '@nestjs/swagger';
import { ApiResponseDto } from './api-response.dto';

/** 账号列表单项，对应 getAccounts / getValidAccounts 返回的 data 二维数组元素 */
export class AccountRowDto {
  @ApiProperty({ example: 1, description: '账号 ID' })
  id: number;

  @ApiProperty({
    example: 3,
    description: '平台类型：1 小红书 / 2 视频号 / 3 抖音 / 4 快手',
  })
  type: number;

  @ApiProperty({
    example: 'uuid.json',
    description: 'Cookie 文件名（存储于 cookiesFile 目录）',
  })
  filePath: string;

  @ApiProperty({ example: '我的抖音号', description: '账号显示名称' })
  userName: string;

  @ApiProperty({ example: 1, description: 'Cookie 状态：1 正常 / 0 异常' })
  status: number;
}

export class AccountListResponseDto extends ApiResponseDto {
  @ApiProperty({
    type: [AccountRowDto],
    description: '账号列表，每项为 [id, type, filePath, userName, status]',
    example: [[1, 3, 'uuid.json', '我的抖音号', 1]],
  })
  declare data: unknown[][];
}
