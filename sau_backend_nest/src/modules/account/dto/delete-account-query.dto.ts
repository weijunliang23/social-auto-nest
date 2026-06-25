import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class DeleteAccountQueryDto {
  @ApiProperty({ example: '1', description: '账号 ID，来自 getAccounts 返回' })
  @IsString()
  id: string;
}
