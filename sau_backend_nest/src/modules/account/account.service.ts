import { Inject, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { existsSync, mkdirSync, unlinkSync, writeFileSync } from 'fs';
import { Model, Types } from 'mongoose';
import { join, relative, resolve } from 'path';
import type { AppConfig } from '../../config/app-config.interface';
import appConfig from '../../config/app.config';
import { PlatformAccount } from '../../database/schemas/platform-account.schema';
import {
  apiErr,
  apiOk,
  type ApiResponse,
} from '../../shared/api-response.util';
import { userCookiesDir } from '../../shared/paths/user-paths.util';
import { isValidObjectId, toObjectId } from '../../shared/utils/object-id.util';
import { AuthService } from './auth.service';

const STATUS_CACHE_MS = 60 * 60 * 1000;

/** 账号 CRUD 与 Cookie 文件读写（按 ownerId 隔离） */
@Injectable()
export class AccountService {
  constructor(
    @InjectModel(PlatformAccount.name)
    private readonly platformAccountModel: Model<PlatformAccount>,
    private readonly authService: AuthService,
    @Inject(appConfig.KEY)
    private readonly app: AppConfig,
  ) {}

  private cookiesDir(ownerId: string): string {
    return userCookiesDir(this.app.baseDir, ownerId);
  }

  private toRow(doc: PlatformAccount & { _id: Types.ObjectId }): unknown[] {
    return [
      String(doc._id),
      doc.type,
      doc.filePath,
      doc.userName,
      doc.status,
    ];
  }

  private isCacheFresh(checkedAt?: Date): boolean {
    if (!checkedAt) {
      return false;
    }
    return Date.now() - checkedAt.getTime() < STATUS_CACHE_MS;
  }

  /** 校验单个账号 Cookie，1 小时内命中缓存则跳过浏览器 */
  async validateAccount(
    ownerId: string,
    accountId: string,
    force = false,
  ): Promise<ApiResponse<unknown[]>> {
    if (!isValidObjectId(accountId)) {
      return apiErr(400, 'Invalid or missing account ID');
    }

    try {
      const record = await this.platformAccountModel
        .findOne({ _id: accountId, ownerId: toObjectId(ownerId) })
        .exec();

      if (!record) {
        return apiErr(404, 'account not found');
      }

      if (!force && this.isCacheFresh(record.statusCheckedAt)) {
        return apiOk(this.toRow(record), null);
      }

      const valid = await this.authService.checkCookie(
        record.type,
        record.filePath,
        { ownerId },
      );
      const status = valid ? 1 : 0;
      const statusCheckedAt = new Date();

      await this.platformAccountModel.updateOne(
        { _id: record._id },
        { status, statusCheckedAt },
      );

      return apiOk(
        [
          String(record._id),
          record.type,
          record.filePath,
          record.userName,
          status,
        ],
        null,
      );
    } catch (e) {
      return apiErr(
        500,
        `校验账号失败: ${e instanceof Error ? e.message : String(e)}`,
      );
    }
  }

  /** SSE 批量校验：逐账号推送 JSON 结果，最后推送 done */
  async validateAccountsStream(
    ownerId: string,
    force: boolean,
    writeSse: (msg: string) => void,
  ): Promise<void> {
    const rows = await this.platformAccountModel
      .find({ ownerId: toObjectId(ownerId) })
      .exec();

    for (const row of rows) {
      const accountId = String(row._id);
      try {
        const result = await this.validateAccount(ownerId, accountId, force);
        if (result.code === 200 && result.data) {
          const [id, type, filePath, userName, status] =
            result.data as unknown[];
          writeSse(
            JSON.stringify({ id, type, filePath, userName, status }),
          );
        } else {
          writeSse(
            JSON.stringify({
              id: accountId,
              error: result.msg || '校验失败',
            }),
          );
        }
      } catch (e) {
        writeSse(
          JSON.stringify({
            id: accountId,
            error: e instanceof Error ? e.message : String(e),
          }),
        );
      }
    }

    writeSse('done');
  }

  /** 逐个校验 cookie 并更新 status，返回带最新状态的账号列表（兼容旧接口） */
  async getValidAccounts(
    ownerId: string,
  ): Promise<ApiResponse<unknown[][]>> {
    try {
      const rows = await this.platformAccountModel
        .find({ ownerId: toObjectId(ownerId) })
        .exec();

      const rowsList: unknown[][] = [];
      for (const row of rows) {
        const result = await this.validateAccount(
          ownerId,
          String(row._id),
          false,
        );
        if (result.code === 200 && result.data) {
          rowsList.push(result.data as unknown[]);
        } else {
          rowsList.push(this.toRow(row));
        }
      }

      return apiOk(rowsList, null);
    } catch (e) {
      return apiErr(
        500,
        `获取有效账号失败: ${e instanceof Error ? e.message : String(e)}`,
      );
    }
  }

  /** 查询当前用户的平台账号列表 */
  async getAccounts(ownerId: string): Promise<ApiResponse<unknown[][]>> {
    try {
      const rows = await this.platformAccountModel
        .find({ ownerId: toObjectId(ownerId) })
        .exec();
      return apiOk(rows.map((row) => this.toRow(row)), null);
    } catch (e) {
      return apiErr(
        500,
        `获取账号列表失败: ${e instanceof Error ? e.message : String(e)}`,
      );
    }
  }

  /** 删除账号记录，并尝试删除对应 Cookie 文件 */
  async deleteAccount(
    ownerId: string,
    accountId: string | undefined,
  ): Promise<ApiResponse<null>> {
    if (!isValidObjectId(accountId)) {
      return apiErr(400, 'Invalid or missing account ID');
    }

    try {
      const record = await this.platformAccountModel
        .findOne({ _id: accountId, ownerId: toObjectId(ownerId) })
        .exec();

      if (!record) {
        return apiErr(404, 'account not found');
      }

      if (record.filePath) {
        const cookiePath = join(this.cookiesDir(ownerId), record.filePath);
        if (existsSync(cookiePath)) {
          try {
            unlinkSync(cookiePath);
          } catch {
            // 与 Python 一致：删除 cookie 失败仍继续删库记录
          }
        }
      }

      await this.platformAccountModel.deleteOne({ _id: record._id }).exec();
      return apiOk(null, 'account deleted successfully');
    } catch (e) {
      return apiErr(
        500,
        `delete failed: ${e instanceof Error ? e.message : String(e)}`,
      );
    }
  }

  /** 更新账号的 type 和 userName 字段 */
  async updateUserinfo(
    ownerId: string,
    body: { id?: string; type?: number; userName?: string },
  ): Promise<ApiResponse<null>> {
    const { id, type, userName } = body;
    if (!id || type === undefined || userName === undefined) {
      return apiErr(400, 'Missing required fields: id, type, userName');
    }
    if (!isValidObjectId(id)) {
      return apiErr(400, 'Invalid account ID');
    }

    try {
      const result = await this.platformAccountModel.updateOne(
        { _id: id, ownerId: toObjectId(ownerId) },
        { type, userName },
      );
      if (result.matchedCount === 0) {
        return apiErr(404, 'account not found');
      }
      return apiOk(null, 'account update successfully');
    } catch {
      return apiErr(500, 'update failed!');
    }
  }

  /** 校验 JSON 格式后，覆盖写入账号对应的 Cookie 文件 */
  async uploadCookie(
    ownerId: string,
    file: Express.Multer.File | undefined,
    accountId: string | undefined,
    platform: string | undefined,
  ): Promise<ApiResponse<null>> {
    if (!file) {
      return apiErr(400, '没有找到Cookie文件');
    }
    if (!file.originalname) {
      return apiErr(400, 'Cookie文件名不能为空');
    }
    if (!file.originalname.endsWith('.json')) {
      return apiErr(400, 'Cookie文件必须是JSON格式');
    }
    if (!accountId || !platform) {
      return apiErr(400, '缺少账号ID或平台信息');
    }
    if (!isValidObjectId(accountId)) {
      return apiErr(400, 'Invalid account ID');
    }

    try {
      const record = await this.platformAccountModel
        .findOne({ _id: accountId, ownerId: toObjectId(ownerId) })
        .exec();

      if (!record) {
        return apiErr(404, '账号不存在');
      }

      const cookieFilePath = join(this.cookiesDir(ownerId), record.filePath);
      mkdirSync(resolve(cookieFilePath, '..'), { recursive: true });
      writeFileSync(cookieFilePath, file.buffer);

      return apiOk(null, 'Cookie文件上传成功');
    } catch (e) {
      return apiErr(
        500,
        `上传Cookie文件失败: ${e instanceof Error ? e.message : String(e)}`,
      );
    }
  }

  /** 解析 Cookie 路径，防止目录穿越 */
  resolveCookiePath(
    ownerId: string,
    filePath: string | undefined,
  ): ApiResponse<null> | { path: string; name: string } {
    if (!filePath) {
      return apiErr(500, '缺少文件路径参数');
    }

    const basePath = resolve(this.cookiesDir(ownerId));
    const cookieFilePath = resolve(join(this.cookiesDir(ownerId), filePath));
    const rel = relative(basePath, cookieFilePath);

    if (rel.startsWith('..') || rel === '..') {
      return apiErr(500, '非法文件路径');
    }

    if (!existsSync(cookieFilePath)) {
      return apiErr(404, 'Cookie文件不存在');
    }

    return {
      path: cookieFilePath,
      name: filePath.split(/[/\\]/).pop() ?? filePath,
    };
  }

  /** 校验 accountList 中的 cookie 文件名均属于当前用户 */
  async validateAccountOwnership(
    ownerId: string,
    accountList: string[],
  ): Promise<boolean> {
    if (!accountList.length) {
      return false;
    }
    const count = await this.platformAccountModel.countDocuments({
      ownerId: toObjectId(ownerId),
      filePath: { $in: accountList },
    });
    return count === accountList.length;
  }
}
