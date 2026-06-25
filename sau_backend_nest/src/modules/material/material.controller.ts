import {
  Body,
  Controller,
  Get,
  Param,
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
  ApiParam,
  ApiProduces,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Response } from 'express';
import type { ApiResponse as ApiResult } from '../../shared/api-response.util';
import { ApiResponseDto } from '../../shared/dto/api-response.dto';
import { CurrentUser, type AuthUser } from '../auth/current-user.decorator';
import { DeleteFileQueryDto } from './dto/delete-file-query.dto';
import { GetFileQueryDto } from './dto/get-file-query.dto';
import { UploadFileDto } from './dto/upload-file.dto';
import { UploadSaveDto } from './dto/upload-save.dto';
import type { MaterialFilePayload } from './material-file.response';
import { MaterialService } from './material.service';

const MAX_FILE_SIZE = 160 * 1024 * 1024;

/** 素材上传、查询、下载与删除接口 */
@ApiTags('素材管理')
@ApiBearerAuth()
@Controller()
export class MaterialController {
  constructor(private readonly materialService: MaterialService) {}

  private sendJson(res: Response, result: ApiResult<unknown>): void {
    const status = result.code >= 400 ? result.code : 200;
    res.status(status).json(result);
  }

  private wantsAttachment(download?: string): boolean {
    return download === '1' || download === 'true';
  }

  private sendMaterialFile(
    res: Response,
    file: MaterialFilePayload,
    asAttachment: boolean,
  ): void {
    res.setHeader('Content-Type', file.mimeType);
    res.setHeader(
      'Content-Disposition',
      `${asAttachment ? 'attachment' : 'inline'}; filename="${encodeURIComponent(file.displayName)}"`,
    );
    res.sendFile(file.path);
  }

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: MAX_FILE_SIZE } }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: '上传素材文件',
    description: '上传视频/图片等到用户 videoFile 目录，不写入 materials 集合。最大 160MB',
  })
  @ApiBody({ type: UploadFileDto })
  @ApiResponse({ status: 200, description: '上传结果', type: ApiResponseDto })
  upload(
    @CurrentUser() user: AuthUser,
    @UploadedFile() file: Express.Multer.File,
    @Res() res: Response,
  ): void {
    this.sendJson(res, this.materialService.upload(user.userId, file));
  }

  @Post('uploadSave')
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: MAX_FILE_SIZE } }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: '上传素材并保存记录',
    description: '上传视频/图片等到用户 videoFile 目录，并写入 materials 集合',
  })
  @ApiBody({ type: UploadSaveDto })
  @ApiResponse({ status: 200, description: '上传并入库结果', type: ApiResponseDto })
  async uploadSave(
    @CurrentUser() user: AuthUser,
    @UploadedFile() file: Express.Multer.File,
    @Body() body: UploadSaveDto,
    @Res() res: Response,
  ): Promise<void> {
    const customFilename =
      typeof body.filename === 'string' ? body.filename : undefined;
    this.sendJson(
      res,
      await this.materialService.uploadSave(user.userId, file, customFilename),
    );
  }

  @Get('getFiles')
  @ApiOperation({
    summary: '获取素材列表',
    description: '查询当前用户已入库的素材记录',
  })
  @ApiResponse({ status: 200, description: '素材列表', type: ApiResponseDto })
  async getFiles(
    @CurrentUser() user: AuthUser,
    @Res() res: Response,
  ): Promise<void> {
    this.sendJson(res, await this.materialService.getFiles(user.userId));
  }

  @Get('getFile')
  @ApiOperation({
    summary: '获取素材文件',
    description: '按存储文件名返回素材二进制流，默认 inline 预览；download=1 时为附件下载',
  })
  @ApiProduces('application/octet-stream')
  @ApiResponse({ status: 200, description: '返回素材文件二进制流' })
  @ApiResponse({ status: 404, description: '文件不存在', type: ApiResponseDto })
  async getFile(
    @CurrentUser() user: AuthUser,
    @Query() query: GetFileQueryDto,
    @Res() res: Response,
  ): Promise<void> {
    const result = await this.materialService.resolveFileForSend(
      user.userId,
      query.filename,
    );
    if ('code' in result) {
      this.sendJson(res, result);
      return;
    }
    this.sendMaterialFile(res, result, this.wantsAttachment(query.download));
  }

  @Get('download/:filename')
  @ApiOperation({
    summary: '下载素材文件',
    description: '兼容旧前端的 /download/{file_path} 路由，需 Bearer 鉴权',
  })
  @ApiParam({
    name: 'filename',
    example: 'UUID_logo.gif',
    description: '磁盘存储文件名（uploadSave 返回的 filepath）',
  })
  @ApiProduces('application/octet-stream')
  @ApiResponse({ status: 200, description: '附件下载' })
  @ApiResponse({ status: 404, description: '文件不存在', type: ApiResponseDto })
  async downloadFile(
    @CurrentUser() user: AuthUser,
    @Param('filename') filename: string,
    @Res() res: Response,
  ): Promise<void> {
    const result = await this.materialService.resolveFileForSend(
      user.userId,
      decodeURIComponent(filename),
    );
    if ('code' in result) {
      this.sendJson(res, result);
      return;
    }
    this.sendMaterialFile(res, result, true);
  }

  @Get('deleteFile')
  @ApiOperation({
    summary: '删除素材',
    description: '按 ID 删除素材记录及磁盘上的文件',
  })
  @ApiResponse({ status: 200, description: '删除结果', type: ApiResponseDto })
  async deleteFile(
    @CurrentUser() user: AuthUser,
    @Query() query: DeleteFileQueryDto,
    @Res() res: Response,
  ): Promise<void> {
    this.sendJson(
      res,
      await this.materialService.deleteFile(user.userId, query.id),
    );
  }
}
