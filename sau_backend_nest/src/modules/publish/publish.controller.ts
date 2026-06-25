import { Body, Controller, Post, Res } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Response } from 'express';
import type { ApiResponse as ApiResult } from '../../shared/api-response.util';
import { ApiResponseDto } from '../../shared/dto/api-response.dto';
import { CurrentUser, type AuthUser } from '../auth/current-user.decorator';
import { PostNoteDto } from './dto/post-note.dto';
import { PostVideoDto } from './dto/post-video.dto';
import { PublishService } from './publish.service';

/** 视频/图文发布入队接口，兼容原 Flask 路由 */
@ApiTags('发布')
@ApiBearerAuth()
@Controller()
export class PublishController {
  constructor(private readonly publishService: PublishService) {}

  private sendJson(res: Response, result: ApiResult<unknown>): void {
    const status = result.code >= 400 ? result.code : 200;
    res.status(status).json(result);
  }

  @Post('postVideo')
  @ApiOperation({
    summary: '发布视频（异步入队）',
    description: '校验参数后写入 publish_records 并加入 BullMQ，立即返回 200',
  })
  @ApiBody({ type: PostVideoDto })
  @ApiResponse({ status: 200, description: '任务已入队', type: ApiResponseDto })
  async postVideo(
    @CurrentUser() user: AuthUser,
    @Body() body: PostVideoDto,
    @Res() res: Response,
  ): Promise<void> {
    this.sendJson(res, await this.publishService.postVideo(user.userId, body));
  }

  @Post(['postNote', 'api/postNote'])
  @ApiOperation({
    summary: '发布图文（异步入队）',
    description: '路由别名：/postNote、/api/postNote',
  })
  @ApiBody({ type: PostNoteDto })
  @ApiResponse({ status: 200, description: '任务已入队', type: ApiResponseDto })
  async postNote(
    @CurrentUser() user: AuthUser,
    @Body() body: PostNoteDto,
    @Res() res: Response,
  ): Promise<void> {
    this.sendJson(res, await this.publishService.postNote(user.userId, body));
  }

  @Post('postVideoBatch')
  @ApiOperation({
    summary: '批量发布视频（异步入队）',
    description: '请求体为 PostVideoDto 数组，每项独立校验并入队',
  })
  @ApiBody({ type: PostVideoDto, isArray: true })
  @ApiResponse({ status: 200, description: '批量任务已入队', type: ApiResponseDto })
  async postVideoBatch(
    @CurrentUser() user: AuthUser,
    @Body() body: PostVideoDto[],
    @Res() res: Response,
  ): Promise<void> {
    this.sendJson(
      res,
      await this.publishService.postVideoBatch(user.userId, body),
    );
  }
}
