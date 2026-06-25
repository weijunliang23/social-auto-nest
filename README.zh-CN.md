# Social Auto Upload — Web 版

[English](./README.md) | **简体中文**

> 基于 NestJS + Vue 3 重构的多平台自媒体发布控制台。本项目在 [dreammis/social-auto-upload](https://github.com/dreammis/social-auto-upload) 的基础上改进，面向可开源部署的 **Web 管理端**，支持 **独立账户登录**、**用户级数据隔离** 与 **Redis 异步发布队列**。

---

## 目录

- [致谢与关系说明](#致谢与关系说明)
- [相对上游的改进](#相对上游的改进)
- [功能特性](#功能特性)
- [技术栈](#技术栈)
- [项目结构](#项目结构)
- [环境要求](#环境要求)
- [快速开始](#快速开始)
- [配置说明](#配置说明)
- [接口概览](#接口概览)
- [免责声明](#免责声明)
- [许可证](#许可证)

---

## 致谢与关系说明

本项目参考并改进自开源项目 **[dreammis/social-auto-upload](https://github.com/dreammis/social-auto-upload)**，在此致谢原作者与社区贡献。

上游项目覆盖更多平台，并提供 CLI / Skill 等能力。**本仓库仅包含 Web 端**（Nest 后端 + Vue 前端），不包含上游的 Python CLI、`uploader/` 与 `skills/` 等目录。

| 目录 | 说明 |
|------|------|
| `sau_backend_nest/` | NestJS API + Patchright 上传器 + BullMQ 队列 |
| `sau_frontend/` | Vue 3 管理端 |

---

## 相对上游的改进

| 项目 | 上游 Web 版 | 本项目 |
|------|-------------|--------|
| 后端 | Flask + SQLite | **NestJS + MongoDB** |
| 登录 | 无应用级多用户 | **注册/登录 + Bearer Token** |
| 数据隔离 | 共享目录 | **`users/{ownerId}/` 按用户隔离** |
| 发布 | 多为同步 | **BullMQ + Redis 异步队列** |
| 前端 | 旧版 Vue 管理端 | **Vue 3 + 移动端适配** |
| 接口文档 | 手工维护 | **Swagger**（`/api`） |
| 浏览器引擎 | Playwright (Python) | **Patchright / Playwright (Node)** |

主要亮点：

- 多用户注册登录，会话 Token 鉴权，适合团队或多运营账号场景
- 平台账号、素材、Cookie、发布记录按用户隔离存储
- 发布任务入 Redis 队列异步执行，Web 端快速返回
- 保留 SSE 扫码登录；支持「应用内扫码 / 有头浏览器官网扫码」两种模式
- 管理端适配移动端布局

---

## 功能特性

### Web 端支持平台

| 平台 | 账号登录 | 视频 | 图文 | 定时发布 |
|------|----------|------|------|----------|
| 抖音 | ✅ | ✅ | ✅ | ✅ |
| 快手 | ✅ | ✅ | ✅ | ✅ |
| 小红书 | ✅ | ✅ | ✅ | ✅ |
| 视频号 | ✅ | ✅ | — | ✅ |

### 管理模块

首页概览 · 账号管理 · 素材管理 · 发布中心 · 发布记录 · 登录/注册

---

## 技术栈

### 后端 — `sau_backend_nest/`

| 层级 | 技术 |
|------|------|
| 运行时 | Node.js 18+ |
| 框架 | NestJS 11 |
| 语言 | TypeScript |
| 数据库 | MongoDB (Mongoose) |
| 队列 | Redis + BullMQ |
| 浏览器自动化 | Patchright / Playwright |
| 接口文档 | Swagger（`/api`） |
| 校验 | class-validator |

### 前端 — `sau_frontend/`

| 层级 | 技术 |
|------|------|
| 框架 | Vue 3 |
| 构建 | Vite 6 |
| UI | Element Plus |
| 状态 | Pinia |
| 路由 | Vue Router 4（Hash 模式） |
| HTTP | Axios |
| 样式 | SCSS |

---

## 项目结构

```
.
├── README.md
├── README.zh-CN.md
├── sau_backend_nest/          # NestJS 后端
│   ├── conf.example.ts        # 复制为 conf.ts 后本地配置
│   └── src/
│       ├── modules/           # auth、account、material、publish 等
│       ├── uploaders/         # 抖音、快手、小红书、视频号
│       └── queue/             # BullMQ 发布处理器
└── sau_frontend/              # Vue 3 管理端
    ├── .env.development
    └── src/
        ├── views/             # 页面
        ├── api/               # 接口封装
        └── utils/request.js   # Axios + Bearer Token
```

---

## 环境要求

| 服务 | 版本 / 说明 |
|------|-------------|
| Node.js | 18+ |
| MongoDB | 建议 6+ |
| Redis | 6+（发布队列必需） |
| Chromium | 通过 Patchright 安装（见快速开始） |

**Docker 示例**

```bash
# MongoDB
docker run -d --name mongo -p 27017:27017 \
  -e MONGO_INITDB_ROOT_USERNAME=admin \
  -e MONGO_INITDB_ROOT_PASSWORD=123456 \
  mongo:7

# Redis
docker run -d --name redis -p 6379:6379 redis:7
```

---

## 快速开始

### 1. 启动后端

```bash
cd sau_backend_nest
npm install
cp conf.example.ts conf.ts
npx patchright install chromium
npm run start:dev
```

- API：`http://localhost:5409`
- Swagger：`http://localhost:5409/api`

### 2. 启动前端

```bash
cd sau_frontend
npm install
npm run dev
```

- 开发地址：`http://localhost:5173`（默认）
- Vite 将 `/api/*` 代理到 `http://localhost:5409/*`

### 3. 首次使用

1. 打开前端，**注册**应用账号。
2. **登录**后，后续请求需携带 `Authorization: Bearer <token>`。
3. 在 **账号管理** 中添加各平台账号（SSE 扫码登录）。
4. 上传素材后，在 **发布中心** 提交发布任务。

发布任务由 Redis 队列异步处理。

---

## 配置说明

### 后端 — `sau_backend_nest/conf.ts`

从 `conf.example.ts` 复制。主要字段：

| 字段 | 默认值 | 说明 |
|------|--------|------|
| `port` | `5409` | API 监听端口 |
| `mongodbUrl` | 见示例 | MongoDB 连接串 |
| `redisUrl` | `redis://127.0.0.1:6379` | BullMQ 使用的 Redis |
| `localChromeHeadless` | `true` | `false` 为有头浏览器，便于登录调试 |
| `localChromePath` | `''` | 可选，自定义 Chrome/Chromium 路径 |
| `baseDir` | 仓库上级目录 | `users/{ownerId}/` 存储根路径 |
| `debugMode` | `true` | 额外日志 |

**环境变量覆盖：** `MONGODB_URL` · `REDIS_URL` · `LOCAL_CHROME_HEADLESS` · `PORT`

**用户数据目录**

```
{baseDir}/users/{ownerId}/cookiesFile/   # 平台 Cookie
{baseDir}/users/{ownerId}/videoFile/     # 上传素材
```

### 前端 — `sau_frontend/.env.development`

| 变量 | 示例 | 说明 |
|------|------|------|
| `VITE_API_BASE_URL` | `/api` | API 基础路径（开发环境走 Vite 代理） |
| `VITE_PORT` | `5173` | 开发服务器端口 |
| `VITE_APP_BRAND_NAME` | `SAU` | 登录页品牌名 |
| `VITE_APP_BRAND_LOGO` | `/logo.png` | Logo 路径或 URL |

**生产环境**

```bash
cd sau_frontend
npm run build
# 输出：sau_frontend/dist/
```

构建后将 `VITE_API_BASE_URL` 指向后端地址，或将 `dist/` 与 API 部署在同一域名下。

---

## 接口概览

除 `/auth/*` 外，其余接口需在 Header 携带 `Authorization: Bearer <token>`。

| 路由 | 方法 | 说明 |
|------|------|------|
| `/auth/register` | POST | 注册用户 |
| `/auth/login` | POST | 登录，返回 token |
| `/getAccounts` | GET | 平台账号列表 |
| `/login` | GET (SSE) | 平台扫码登录流 |
| `/uploadSave` | POST | 上传素材并入库 |
| `/getFiles` | GET | 素材列表 |
| `/getFile` | GET | 预览/下载文件 |
| `/postVideo` | POST | 视频发布入队 |
| `/postNote` | POST | 图文发布入队 |
| `/getPublishRecords` | GET | 发布记录 |

完整交互文档：**`http://localhost:5409/api`**（Swagger）。

更多后端说明：[`sau_backend_nest/README.md`](sau_backend_nest/README.md)

---

## 免责声明

本项目通过浏览器自动化操作第三方平台，请在遵守各平台服务协议及当地法律法规的前提下使用。因使用本工具导致的账号限制、内容违规等风险由使用者自行承担。

---

## 许可证

MIT License — 可参考上游 [dreammis/social-auto-upload](https://github.com/dreammis/social-auto-upload)。

开源发布时建议添加 `LICENSE` 文件，并保留对上游项目的致谢。

---

## Star 与贡献

欢迎提交 Issue 与 PR。请勿将 `conf.ts`、含密码的 `.env` 等敏感文件提交到公开仓库。
