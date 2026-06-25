import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiProduces,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Response } from 'express';
import type { ApiResponse as ApiResult } from '../../shared/api-response.util';
import { AccountListResponseDto } from '../../shared/dto/account-row.dto';
import { ApiResponseDto } from '../../shared/dto/api-response.dto';
import { CurrentUser, type AuthUser } from '../auth/current-user.decorator';
import { AccountService } from './account.service';
import { DeleteAccountQueryDto } from './dto/delete-account-query.dto';
import { DownloadCookieQueryDto } from './dto/download-cookie-query.dto';
import { LoginQueryDto } from './dto/login-query.dto';
import { UpdateUserinfoDto } from './dto/update-userinfo.dto';
import { UploadCookieDto } from './dto/upload-cookie.dto';
import { ValidateAccountQueryDto } from './dto/validate-account-query.dto';
import { ValidateAccountsQueryDto } from './dto/validate-accounts-query.dto';
import { LoginService } from './login.service';

/** 账号相关 HTTP 接口，兼容原 Flask 路由 */
@ApiTags('账号管理')
@ApiBearerAuth()
@Controller()
export class AccountController {
  constructor(
    private readonly accountService: AccountService,
    private readonly loginService: LoginService,
  ) {}

  private sendJson(res: Response, result: ApiResult<unknown>): void {
    const status = result.code >= 400 ? result.code : 200;
    res.status(status).json(result);
  }

  @Get('getAccounts')
  @ApiOperation({
    summary: '获取账号列表',
    description:
      '查询当前用户的平台账号。data 为二维数组，每项格式 [id, type, filePath, userName, status]',
  })
  @ApiResponse({
    status: 200,
    description: '账号列表',
    type: AccountListResponseDto,
  })
  async getAccounts(@CurrentUser() user: AuthUser, @Res() res: Response): Promise<void> {
    this.sendJson(res, await this.accountService.getAccounts(user.userId));
  }

  @Get('getValidAccounts')
  @ApiOperation({
    summary: '获取有效账号列表',
    description:
      '逐个打开浏览器校验 Cookie 有效性，更新 status 后返回列表。status：1 正常 / 0 异常',
  })
  @ApiResponse({
    status: 200,
    description: '校验后的账号列表',
    type: AccountListResponseDto,
  })
  async getValidAccounts(
    @CurrentUser() user: AuthUser,
    @Res() res: Response,
  ): Promise<void> {
    this.sendJson(
      res,
      await this.accountService.getValidAccounts(user.userId),
    );
  }

  @Get('validateAccount')
  @ApiOperation({
    summary: '校验单个账号 Cookie',
    description:
      '校验指定账号 Cookie 有效性并更新 status。1 小时内已校验过则返回缓存结果；传 force=1 强制重验',
  })
  @ApiResponse({
    status: 200,
    description: '账号行 [id, type, filePath, userName, status]',
    type: ApiResponseDto,
  })
  async validateAccount(
    @CurrentUser() user: AuthUser,
    @Query() query: ValidateAccountQueryDto,
    @Res() res: Response,
  ): Promise<void> {
    this.sendJson(
      res,
      await this.accountService.validateAccount(
        user.userId,
        query.id,
        this.parseForce(query.force),
      ),
    );
  }

  @Get('validateAccounts')
  @ApiOperation({
    summary: 'SSE 批量校验账号 Cookie',
    description:
      '逐账号校验并通过 SSE 推送结果。每条 data 为 JSON；全部完成后推送 data: done',
  })
  @ApiProduces('text/event-stream')
  @ApiResponse({ status: 200, description: 'SSE 事件流' })
  validateAccounts(
    @CurrentUser() user: AuthUser,
    @Query() query: ValidateAccountsQueryDto,
    @Res() res: Response,
  ): void {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('X-Accel-Buffering', 'no');
    res.setHeader('Connection', 'keep-alive');

    const writeSse = (msg: string): void => {
      res.write(`data: ${msg}\n\n`);
    };

    void this.accountService
      .validateAccountsStream(
        user.userId,
        this.parseForce(query.force),
        writeSse,
      )
      .then(() => {
        if (!res.writableEnded) {
          res.end();
        }
      })
      .catch((e) => {
        writeSse(
          JSON.stringify({
            error: e instanceof Error ? e.message : String(e),
          }),
        );
        writeSse('done');
        if (!res.writableEnded) {
          res.end();
        }
      });
  }

  @Get('login')
  @ApiOperation({
    summary: 'SSE 扫码登录',
    description:
      '通过 Server-Sent Events 推送登录二维码与结果。type：1 小红书 / 2 视频号 / 3 抖音 / 4 快手',
  })
  @ApiProduces('text/event-stream')
  @ApiResponse({ status: 200, description: 'SSE 事件流' })
  @ApiResponse({ status: 400, description: '缺少 type 或 id 参数', type: ApiResponseDto })
  login(
    @CurrentUser() user: AuthUser,
    @Query() query: LoginQueryDto,
    @Res() res: Response,
  ): void {
    const { type, id, browserLogin } = query;
    if (!type || !id) {
      res
        .status(400)
        .json({ code: 400, msg: '缺少 type 或 id 参数', data: null });
      return;
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('X-Accel-Buffering', 'no');
    res.setHeader('Connection', 'keep-alive');

    this.loginService.cancelLogin(user.userId, id);

    const writeSse = (msg: string): void => {
      res.write(`data: ${msg}\n\n`);
    };

    this.loginService.startLogin(type, id, writeSse, {
      ownerId: user.userId,
      browserLogin: this.parseBrowserLogin(browserLogin),
    });

    res.on('close', () => {
      this.loginService.cancelLogin(user.userId, id);
    });
  }

  private parseBrowserLogin(value?: string): boolean {
    if (!value) {
      return false;
    }
    const normalized = value.toLowerCase();
    return normalized === 'true' || normalized === '1';
  }

  private parseForce(value?: string): boolean {
    if (!value) {
      return false;
    }
    const normalized = value.toLowerCase();
    return normalized === 'true' || normalized === '1';
  }

  @Get('deleteAccount')
  @ApiOperation({
    summary: '删除账号',
    description: '按 ID 删除平台账号记录及对应的 Cookie 文件',
  })
  @ApiResponse({ status: 200, description: '删除结果', type: ApiResponseDto })
  async deleteAccount(
    @CurrentUser() user: AuthUser,
    @Query() query: DeleteAccountQueryDto,
    @Res() res: Response,
  ): Promise<void> {
    this.sendJson(
      res,
      await this.accountService.deleteAccount(user.userId, query.id),
    );
  }

  @Post('updateUserinfo')
  @ApiOperation({
    summary: '更新账号信息',
    description: '更新账号的平台类型（type）与显示名称（userName）',
  })
  @ApiBody({ type: UpdateUserinfoDto })
  @ApiResponse({ status: 200, description: '更新结果', type: ApiResponseDto })
  async updateUserinfo(
    @CurrentUser() user: AuthUser,
    @Body() body: UpdateUserinfoDto,
    @Res() res: Response,
  ): Promise<void> {
    this.sendJson(
      res,
      await this.accountService.updateUserinfo(user.userId, {
        id: body.id !== undefined ? String(body.id) : undefined,
        type: body.type,
        userName: body.userName,
      }),
    );
  }

  @Post('uploadCookie')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: '上传 Cookie 文件',
    description: '上传账号 Cookie JSON 文件并关联到指定账号',
  })
  @ApiBody({ type: UploadCookieDto })
  @ApiResponse({ status: 200, description: '上传结果', type: ApiResponseDto })
  async uploadCookie(
    @CurrentUser() user: AuthUser,
    @UploadedFile() file: Express.Multer.File,
    @Body() body: UploadCookieDto,
    @Res() res: Response,
  ): Promise<void> {
    const accountId = typeof body.id === 'string' ? body.id : undefined;
    const platform =
      typeof body.platform === 'string' ? body.platform : undefined;
    this.sendJson(
      res,
      await this.accountService.uploadCookie(
        user.userId,
        file,
        accountId,
        platform,
      ),
    );
  }

  @Get('downloadCookie')
  @ApiOperation({
    summary: '下载 Cookie 文件',
    description: '按 filePath 下载指定 Cookie JSON 文件',
  })
  @ApiProduces('application/octet-stream')
  @ApiResponse({ status: 200, description: '返回 Cookie 文件二进制流' })
  @ApiResponse({ status: 404, description: '文件不存在', type: ApiResponseDto })
  downloadCookie(
    @CurrentUser() user: AuthUser,
    @Query() query: DownloadCookieQueryDto,
    @Res() res: Response,
  ): void {
    const result = this.accountService.resolveCookiePath(
      user.userId,
      query.filePath,
    );
    if ('code' in result) {
      this.sendJson(res, result);
      return;
    }
    res.download(result.path, result.name);
  }
}
