import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class AuthCredentialsDto {
  @ApiProperty({ example: 'admin', maxLength: 15 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(15)
  username!: string;

  @ApiProperty({ example: '123456', maxLength: 15 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(15)
  password!: string;
}
