import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { randomBytes } from 'crypto';
import { Model } from 'mongoose';
import { AppSession } from '../../database/schemas/app-session.schema';
import { AppUser, type AppUserDocument } from '../../database/schemas/app-user.schema';
import {
  apiErr,
  apiOk,
  type ApiResponse,
} from '../../shared/api-response.util';
import type { AuthUser } from './current-user.decorator';

@Injectable()
export class AppAuthService {
  constructor(
    @InjectModel(AppUser.name)
    private readonly appUserModel: Model<AppUser>,
    @InjectModel(AppSession.name)
    private readonly appSessionModel: Model<AppSession>,
  ) {}

  private validateCredentials(
    username: string,
    password: string,
  ): ApiResponse<null> | null {
    const trimmedUser = username.trim();
    const trimmedPass = password.trim();
    if (!trimmedUser || !trimmedPass) {
      return apiErr(400, '用户名和密码不能为空');
    }
    if (trimmedUser.length > 15 || trimmedPass.length > 15) {
      return apiErr(400, '用户名和密码不能超过15个字符');
    }
    return null;
  }

  private async createSession(userId: string): Promise<string> {
    const token = randomBytes(32).toString('hex');
    await this.appSessionModel.create({ token, userId });
    return token;
  }

  async register(
    username: string,
    password: string,
  ): Promise<ApiResponse<{ token: string; username: string }>> {
    const validationError = this.validateCredentials(username, password);
    if (validationError) {
      return validationError as unknown as ApiResponse<{
        token: string;
        username: string;
      }>;
    }

    const trimmedUser = username.trim();
    const trimmedPass = password.trim();

    const existing = await this.appUserModel.findOne({ username: trimmedUser });
    if (existing) {
      return apiErr(409, '用户名已存在');
    }

    const user = await this.appUserModel.create({
      username: trimmedUser,
      password: trimmedPass,
    });

    const token = await this.createSession(String(user._id));
    return apiOk({ token, username: trimmedUser }, '注册成功');
  }

  async login(
    username: string,
    password: string,
  ): Promise<ApiResponse<{ token: string; username: string }>> {
    const validationError = this.validateCredentials(username, password);
    if (validationError) {
      return validationError as unknown as ApiResponse<{
        token: string;
        username: string;
      }>;
    }

    const trimmedUser = username.trim();
    const trimmedPass = password.trim();

    const user = await this.appUserModel.findOne({
      username: trimmedUser,
      password: trimmedPass,
    });
    if (!user) {
      return apiErr(401, '用户名或密码错误');
    }

    const token = await this.createSession(String(user._id));
    return apiOk({ token, username: trimmedUser }, '登录成功');
  }

  async validateToken(token: string): Promise<AuthUser | null> {
    const session = await this.appSessionModel
      .findOne({ token })
      .populate<{ userId: AppUser }>('userId')
      .exec();
    if (!session?.userId) {
      return null;
    }

    const user =
      typeof session.userId === 'object' && 'username' in session.userId
        ? session.userId
        : await this.appUserModel.findById(session.userId).exec();
    if (!user) {
      return null;
    }

    const userDoc = user as AppUserDocument;
    return {
      userId: String(userDoc._id),
      username: userDoc.username,
    };
  }
}
