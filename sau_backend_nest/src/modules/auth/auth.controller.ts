import { Body, Controller, Post, Res } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import type { ApiResponse as ApiResult } from '../../shared/api-response.util';
import { ApiResponseDto } from '../../shared/dto/api-response.dto';
import { AppAuthService } from './app-auth.service';
import { AuthCredentialsDto } from './dto/auth-credentials.dto';
import { Public } from './public.decorator';

@ApiTags('认证')
@Controller('auth')
export class AuthController {
  constructor(private readonly appAuthService: AppAuthService) {}

  private sendJson(res: Response, result: ApiResult<unknown>): void {
    const status = result.code >= 400 ? result.code : 200;
    res.status(status).json(result);
  }

  @Public()
  @Post('register')
  @ApiOperation({ summary: '注册', description: '用户名和密码均不超过15个字符，明文存储' })
  @ApiBody({ type: AuthCredentialsDto })
  @ApiResponse({ status: 200, description: '注册成功', type: ApiResponseDto })
  async register(
    @Body() body: AuthCredentialsDto,
    @Res() res: Response,
  ): Promise<void> {
    this.sendJson(
      res,
      await this.appAuthService.register(body.username, body.password),
    );
  }

  @Public()
  @Post('login')
  @ApiOperation({ summary: '登录' })
  @ApiBody({ type: AuthCredentialsDto })
  @ApiResponse({ status: 200, description: '登录成功', type: ApiResponseDto })
  async login(
    @Body() body: AuthCredentialsDto,
    @Res() res: Response,
  ): Promise<void> {
    this.sendJson(
      res,
      await this.appAuthService.login(body.username, body.password),
    );
  }
}
