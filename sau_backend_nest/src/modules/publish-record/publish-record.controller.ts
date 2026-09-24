import { Controller, Get, Query, Res } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Response } from 'express';
import type { ApiResponse as ApiResult } from '../../shared/api-response.util';
import { ApiResponseDto } from '../../shared/dto/api-response.dto';
import { CurrentUser, type AuthUser } from '../auth/current-user.decorator';
import { DeletePublishRecordQueryDto } from './dto/delete-publish-record-query.dto';
import { GetPublishRecordQueryDto } from './dto/get-publish-record-query.dto';
import { GetPublishRecordsQueryDto } from './dto/get-publish-records-query.dto';
import { PublishRecordService } from './publish-record.service';

/** 发布记录查询与删除接口 */
@ApiTags('发布记录')
@ApiBearerAuth()
@Controller()
export class PublishRecordController {
  constructor(private readonly publishRecordService: PublishRecordService) {}

  private sendJson(res: Response, result: ApiResult<unknown>): void {
    const status = result.code >= 400 ? result.code : 200;
    res.status(status).json(result);
  }

  @Get('getPublishRecord')
  @ApiOperation({
    summary: '查询单条发布记录',
    description: '用于轮询发布任务最终状态（queued / running / success / failed）',
  })
  @ApiResponse({ status: 200, description: '发布记录详情', type: ApiResponseDto })
  async getPublishRecord(
    @CurrentUser() user: AuthUser,
    @Query() query: GetPublishRecordQueryDto,
    @Res() res: Response,
  ): Promise<void> {
    this.sendJson(
      res,
      await this.publishRecordService.getPublishRecord(user.userId, query.id),
    );
  }

  @Get('getPublishRecords')
  @ApiOperation({
    summary: '查询发布记录',
    description: '按平台、内容类型、状态、关键词筛选当前用户的发布记录',
  })
  @ApiResponse({ status: 200, description: '发布记录列表', type: ApiResponseDto })
  async getPublishRecords(
    @CurrentUser() user: AuthUser,
    @Query() query: GetPublishRecordsQueryDto,
    @Res() res: Response,
  ): Promise<void> {
    this.sendJson(
      res,
      await this.publishRecordService.getPublishRecords(user.userId, {
        platform: query.platform,
        kind: query.kind,
        status: query.status,
        keyword: query.keyword,
        page: query.page,
        limit: query.limit,
      }),
    );
  }

  @Get('deletePublishRecord')
  @ApiOperation({
    summary: '取消发布记录',
    description: '软取消发布任务并从队列移除 waiting 中的 job',
  })
  @ApiResponse({ status: 200, description: '取消结果', type: ApiResponseDto })
  async deletePublishRecord(
    @CurrentUser() user: AuthUser,
    @Query() query: DeletePublishRecordQueryDto,
    @Res() res: Response,
  ): Promise<void> {
    this.sendJson(
      res,
      await this.publishRecordService.deletePublishRecord(
        user.userId,
        query.id,
      ),
    );
  }
}
