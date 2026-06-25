import { Inject, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { randomUUID } from 'crypto';
import { existsSync, mkdirSync, statSync, unlinkSync, writeFileSync } from 'fs';
import { Model } from 'mongoose';
import { join } from 'path';
import type { AppConfig } from '../../config/app-config.interface';
import appConfig from '../../config/app.config';
import { Material } from '../../database/schemas/material.schema';
import {
  apiErr,
  apiOk,
  type ApiResponse,
} from '../../shared/api-response.util';
import { userVideoDir } from '../../shared/paths/user-paths.util';
import {
  assertSafeStoredFilename,
  guessMimeType,
  stripStoredFilenamePrefix,
} from '../../shared/utils/file-mime.util';
import type { MaterialFilePayload } from './material-file.response';
import { isValidObjectId, toObjectId } from '../../shared/utils/object-id.util';

/** 视频素材存储与 materials collection 操作（按 ownerId 隔离） */
@Injectable()
export class MaterialService {
  constructor(
    @InjectModel(Material.name)
    private readonly materialModel: Model<Material>,
    @Inject(appConfig.KEY)
    private readonly app: AppConfig,
  ) {}

  private videoDir(ownerId: string): string {
    return userVideoDir(this.app.baseDir, ownerId);
  }

  /** 以 uuid_原名 格式保存文件，不写数据库 */
  upload(
    ownerId: string,
    file: Express.Multer.File | undefined,
  ): ApiResponse<string> {
    if (!file) {
      return apiErr(400, 'No file part in the request');
    }
    if (!file.originalname) {
      return apiErr(400, 'No selected file');
    }

    try {
      const dir = this.videoDir(ownerId);
      mkdirSync(dir, { recursive: true });
      const uuid = randomUUID();
      const finalName = `${uuid}_${file.originalname}`;
      writeFileSync(join(dir, finalName), file.buffer);
      return apiOk(finalName, 'File uploaded successfully');
    } catch (e) {
      return apiErr(500, e instanceof Error ? e.message : String(e));
    }
  }

  /** 保存文件并插入 materials，支持自定义文件名 */
  async uploadSave(
    ownerId: string,
    file: Express.Multer.File | undefined,
    customFilename?: string,
  ): Promise<ApiResponse<{ filename: string; filepath: string }>> {
    if (!file) {
      return apiErr(400, 'No file part in the request');
    }
    if (!file.originalname) {
      return apiErr(400, 'No selected file');
    }

    let filename: string;
    if (customFilename) {
      const ext = file.originalname.split('.').pop() ?? '';
      filename = ext ? `${customFilename}.${ext}` : customFilename;
    } else {
      filename = file.originalname;
    }

    try {
      const dir = this.videoDir(ownerId);
      mkdirSync(dir, { recursive: true });
      const uuid = randomUUID();
      const finalFilename = `${uuid}_${filename}`;
      const filepath = join(dir, finalFilename);
      writeFileSync(filepath, file.buffer);

      const filesize =
        Math.round((statSync(filepath).size / (1024 * 1024)) * 100) / 100;

      await this.materialModel.create({
        ownerId: toObjectId(ownerId),
        filename,
        filesize,
        file_path: finalFilename,
      });

      return apiOk(
        { filename, filepath: finalFilename },
        'File uploaded and saved successfully',
      );
    } catch (e) {
      return apiErr(
        500,
        `upload failed: ${e instanceof Error ? e.message : String(e)}`,
      );
    }
  }

  /** 查询素材列表，从 file_path 提取 uuid */
  async getFiles(
    ownerId: string,
  ): Promise<ApiResponse<Record<string, unknown>[]>> {
    try {
      const rows = await this.materialModel
        .find({ ownerId: toObjectId(ownerId) })
        .exec();

      const data = rows.map((row) => {
        const filePath = row.file_path;
        const idx = filePath.indexOf('_');
        return {
          id: String(row._id),
          filename: row.filename,
          filesize: row.filesize,
          upload_time: (row as Material & { upload_time?: Date }).upload_time,
          file_path: row.file_path,
          uuid: idx >= 0 ? filePath.slice(0, idx) : filePath,
        };
      });

      return apiOk(data, 'success');
    } catch {
      return apiErr(500, 'get file failed!');
    }
  }

  /** 拼接素材路径，校验文件名合法性 */
  resolveFilePath(
    ownerId: string,
    filename: string,
  ): ApiResponse<null> | { path: string } {
    const safeName = assertSafeStoredFilename(filename);
    if (!safeName) {
      return filename
        ? apiErr(400, 'Invalid filename')
        : apiErr(400, 'filename is required');
    }

    const fullPath = join(this.videoDir(ownerId), safeName);
    if (!existsSync(fullPath)) {
      return apiErr(404, 'File not found');
    }
    return { path: fullPath };
  }

  /** 解析素材文件流信息（预览/下载） */
  async resolveFileForSend(
    ownerId: string,
    storedFilename: string,
  ): Promise<ApiResponse<null> | MaterialFilePayload> {
    const resolved = this.resolveFilePath(ownerId, storedFilename);
    if ('code' in resolved) {
      return resolved;
    }

    const safeName = assertSafeStoredFilename(storedFilename);
    if (!safeName) {
      return apiErr(400, 'Invalid filename');
    }

    const record = await this.materialModel
      .findOne({
        ownerId: toObjectId(ownerId),
        file_path: safeName,
      })
      .select('filename')
      .lean()
      .exec();

    const displayName =
      record?.filename ?? stripStoredFilenamePrefix(storedFilename);

    return {
      path: resolved.path,
      mimeType: guessMimeType(storedFilename),
      displayName,
    };
  }

  /** 删除磁盘文件和 materials 记录 */
  async deleteFile(
    ownerId: string,
    fileId: string | undefined,
  ): Promise<ApiResponse<{ id: string; filename: string }>> {
    if (!isValidObjectId(fileId)) {
      return apiErr(400, 'Invalid or missing file ID');
    }

    try {
      const record = await this.materialModel
        .findOne({ _id: fileId, ownerId: toObjectId(ownerId) })
        .exec();

      if (!record) {
        return apiErr(404, 'File not found');
      }

      const filePath = join(this.videoDir(ownerId), record.file_path);
      if (existsSync(filePath)) {
        try {
          unlinkSync(filePath);
        } catch {
          // 与 Python 一致：删除文件失败仍继续删库记录
        }
      }

      await this.materialModel.deleteOne({ _id: record._id }).exec();

      return apiOk(
        { id: String(record._id), filename: record.filename },
        'File deleted successfully',
      );
    } catch {
      return apiErr(500, 'delete failed!');
    }
  }

  /** 校验 fileList 中的文件属于当前用户（素材库记录或本地上传目录下的文件） */
  async validateMaterialOwnership(
    ownerId: string,
    fileList: string[],
  ): Promise<boolean> {
    if (!fileList.length) {
      return false;
    }

    const dbRecords = await this.materialModel
      .find({ ownerId: toObjectId(ownerId), file_path: { $in: fileList } })
      .select('file_path')
      .lean()
      .exec();

    const ownedInDb = new Set(dbRecords.map((record) => record.file_path));

    for (const filename of fileList) {
      if (ownedInDb.has(filename)) {
        continue;
      }
      // 本地上传（/upload）不写 materials，仅保存在用户 videoFile 目录
      const resolved = this.resolveFilePath(ownerId, filename);
      if ('code' in resolved) {
        return false;
      }
    }

    return true;
  }
}
