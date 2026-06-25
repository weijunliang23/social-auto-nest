# sau_backend_nest

NestJS 版 Social Auto Upload 后端，替代原 Python Flask `sau_backend.py`。

## 依赖

- Node.js 18+
- **MongoDB**（默认 `mongodb://127.0.0.1:27017/sau`）
- **Redis**（BullMQ 发布队列，默认 `redis://127.0.0.1:6379`）

启动 MongoDB 示例（若 Docker 镜像启用了认证，请同步修改 `conf.ts` 中的 `mongodbUrl`）：

```bash
docker run -d --name mongo -p 27017:27017 -e MONGO_INITDB_ROOT_USERNAME=admin -e MONGO_INITDB_ROOT_PASSWORD=123456 mongo:7
```

默认连接串见 [`conf.example.ts`](conf.example.ts)：`mongodb://admin:123456@127.0.0.1:27017/sau?authSource=admin`

## 配置

复制 [`conf.example.ts`](conf.example.ts) 为 `conf.ts`（已 gitignore），主要字段：

| 字段 | 说明 |
|------|------|
| `mongodbUrl` | MongoDB 连接串 |
| `redisUrl` | Redis 连接串 |
| `localChromeHeadless` | 浏览器有头/无头 |
| `port` | API 端口，默认 5409 |

环境变量可覆盖：`MONGODB_URL`、`REDIS_URL`、`LOCAL_CHROME_HEADLESS` 等。

## 用户认证

- `POST /auth/register` — 注册（用户名/密码均 ≤15 字符，明文存储，仅限内网）
- `POST /auth/login` — 登录，返回 `token`
- 其余 API 需在 Header 携带 `Authorization: Bearer <token>`

数据按 `ownerId` 隔离：平台账号、素材、发布记录、Cookie/视频文件目录均为 `users/{ownerId}/`。

## 运行

```bash
npm install
npm run start:dev
```

Swagger：http://localhost:5409/api

## 数据模型（MongoDB）

| Collection | 说明 |
|------------|------|
| `app_users` | 应用用户 |
| `app_sessions` | 登录 token（7 天 TTL） |
| `platform_accounts` | 抖音/快手/小红书/视频号账号 |
| `materials` | 素材元数据 |
| `publish_records` | 发布任务记录 |

文件目录：

```
{baseDir}/users/{ownerId}/cookiesFile/
{baseDir}/users/{ownerId}/videoFile/
```

## 素材 API（MaterialModule）

| 路由 | 方法 | 说明 |
|------|------|------|
| `/upload` | POST | 上传素材到 `users/{ownerId}/videoFile/`，不写库 |
| `/uploadSave` | POST | 上传并写入 `materials` 集合 |
| `/getFiles` | GET | 素材列表 |
| `/getFile?filename=` | GET | 预览/下载文件流；`download=1` 为附件 |
| `/download/:filename` | GET | 附件下载（兼容旧前端路径） |
| `/deleteFile?id=` | GET | 删除素材 |

文件存储路径：`{baseDir}/users/{ownerId}/videoFile/{uuid}_{原始文件名}`

## 前端联调

`sau_frontend` 已增加登录/注册页与路由守卫，`.env.development` 中 `VITE_API_BASE_URL` 指向本服务即可。
