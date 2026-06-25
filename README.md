# Social Auto Upload — Web Edition

**English** | [简体中文](./README.zh-CN.md)

> A multi-platform social media publishing console rebuilt with NestJS + Vue 3. Forked and improved from [dreammis/social-auto-upload](https://github.com/dreammis/social-auto-upload), focused on a production-ready **Web admin** with **multi-user auth**, **per-user data isolation**, and **Redis-backed async publishing**.

---

## Table of Contents

- [Acknowledgments](#acknowledgments)
- [What's New](#whats-new)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Requirements](#requirements)
- [Quick Start](#quick-start)
- [Configuration](#configuration)
- [API Overview](#api-overview)
- [Disclaimer](#disclaimer)
- [License](#license)

---

## Acknowledgments

This repository is an **independent Web-focused fork** inspired by the excellent open-source project:

- Upstream: **[dreammis/social-auto-upload](https://github.com/dreammis/social-auto-upload)**

The upstream project provides browser automation uploaders for many platforms and a mature CLI/Skill ecosystem. **This repo only ships the Web stack**:

| Directory | Description |
|-----------|-------------|
| `sau_backend_nest/` | NestJS API + Playwright/Patchright uploaders + BullMQ workers |
| `sau_frontend/` | Vue 3 admin UI |

It does **not** include the upstream Python CLI, `uploader/` Python modules, or `skills/` directory.

---

## What's New

| Topic | Upstream (Web) | This Project |
|-------|----------------|--------------|
| Backend | Flask + SQLite | **NestJS + MongoDB** |
| Auth | Single-tenant / no app login | **Register / Login + Bearer Token** |
| Data isolation | Shared directories | **`users/{ownerId}/` per account** |
| Publishing | Mostly synchronous | **BullMQ + Redis async queue** |
| Frontend | Legacy Vue admin | **Vue 3 + mobile-friendly layout** |
| API docs | Manual | **Swagger UI** at `/api` |
| Browser engine | Playwright (Python) | **Patchright / Playwright (Node)** |

Highlights:

- Multi-user register/login with Bearer token auth
- Platform accounts, materials, cookies, and publish records isolated per user
- Publish jobs run asynchronously via Redis queue
- SSE QR login; in-app scan or headed browser official-site scan
- Mobile-responsive admin UI

---

## Features

### Supported platforms (Web)

| Platform | Account login | Video | Note/Image-text | Scheduled publish |
|----------|---------------|-------|-----------------|-------------------|
| Douyin | ✅ | ✅ | ✅ | ✅ |
| Kuaishou | ✅ | ✅ | ✅ | ✅ |
| Xiaohongshu | ✅ | ✅ | ✅ | ✅ |
| WeChat Channels | ✅ | ✅ | — | ✅ |

### Admin modules

Dashboard · Account management · Material library · Publish center · Publish history · Auth (login/register)

---

## Tech Stack

### Backend — `sau_backend_nest/`

| Layer | Technology |
|-------|------------|
| Runtime | Node.js 18+ |
| Framework | NestJS 11 |
| Language | TypeScript |
| Database | MongoDB (Mongoose) |
| Queue | Redis + BullMQ |
| Browser automation | Patchright / Playwright |
| API docs | Swagger (`/api`) |
| Validation | class-validator |

### Frontend — `sau_frontend/`

| Layer | Technology |
|-------|------------|
| Framework | Vue 3 |
| Build | Vite 6 |
| UI | Element Plus |
| State | Pinia |
| Router | Vue Router 4 (Hash mode) |
| HTTP | Axios |
| Styles | SCSS |

---

## Project Structure

```
.
├── README.md
├── README.zh-CN.md
├── sau_backend_nest/          # NestJS backend
│   ├── conf.example.ts        # Copy to conf.ts for local config
│   └── src/
│       ├── modules/           # auth, account, material, publish, ...
│       ├── uploaders/         # douyin, kuaishou, xiaohongshu, tencent
│       └── queue/             # BullMQ publish processor
└── sau_frontend/              # Vue 3 admin
    ├── .env.development
    └── src/
        ├── views/             # pages
        ├── api/               # API clients
        └── utils/request.js   # Axios + Bearer token
```

---

## Requirements

| Service | Version / Notes |
|---------|-----------------|
| Node.js | 18+ |
| MongoDB | 6+ recommended |
| Redis | 6+ (required for publish queue) |
| Chromium | Install via Patchright/Playwright (see Quick Start) |

**Docker examples**

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

## Quick Start

### 1. Backend

```bash
cd sau_backend_nest
npm install
cp conf.example.ts conf.ts
npx patchright install chromium
npm run start:dev
```

- API: `http://localhost:5409`
- Swagger: `http://localhost:5409/api`

### 2. Frontend

```bash
cd sau_frontend
npm install
npm run dev
```

- Dev server: `http://localhost:5173` (default)
- Vite proxies `/api/*` → `http://localhost:5409/*`

### 3. First use

1. Open the frontend and **Register** a user account.
2. **Login** — all subsequent API calls use `Authorization: Bearer <token>`.
3. Add platform accounts in **Account Management** (SSE QR login).
4. Upload materials, then publish from **Publish Center**.

Publish tasks are processed asynchronously by the Redis queue.

---

## Configuration

### Backend — `sau_backend_nest/conf.ts`

Copy from `conf.example.ts`. Key fields:

| Field | Default | Description |
|-------|---------|-------------|
| `port` | `5409` | API listen port |
| `mongodbUrl` | see example | MongoDB connection string |
| `redisUrl` | `redis://127.0.0.1:6379` | Redis for BullMQ |
| `localChromeHeadless` | `true` | `false` = headed browser for login/debug |
| `localChromePath` | `''` | Optional custom Chrome/Chromium path |
| `baseDir` | repo parent dir | Root for `users/{ownerId}/` storage |
| `debugMode` | `true` | Extra logging |

**Environment overrides:** `MONGODB_URL` · `REDIS_URL` · `LOCAL_CHROME_HEADLESS` · `PORT`

**User data layout**

```
{baseDir}/users/{ownerId}/cookiesFile/   # platform cookies
{baseDir}/users/{ownerId}/videoFile/     # uploaded materials
```

### Frontend — `sau_frontend/.env.development`

| Variable | Example | Description |
|----------|---------|-------------|
| `VITE_API_BASE_URL` | `/api` | API base (use Vite proxy in dev) |
| `VITE_PORT` | `5173` | Dev server port |
| `VITE_APP_BRAND_NAME` | `SAU` | Login page brand name |
| `VITE_APP_BRAND_LOGO` | `/logo.png` | Logo path or URL |

**Production**

```bash
cd sau_frontend
npm run build
# output: sau_frontend/dist/
```

Build the frontend and point `VITE_API_BASE_URL` to your backend URL, or serve `dist/` behind the same origin as the API.

---

## API Overview

All routes except `/auth/*` require `Authorization: Bearer <token>`.

| Route | Method | Description |
|-------|--------|-------------|
| `/auth/register` | POST | Register app user |
| `/auth/login` | POST | Login, returns token |
| `/getAccounts` | GET | List platform accounts |
| `/login` | GET (SSE) | Platform QR login stream |
| `/uploadSave` | POST | Upload material + DB record |
| `/getFiles` | GET | Material list |
| `/getFile` | GET | Preview/download file |
| `/postVideo` | POST | Enqueue video publish job |
| `/postNote` | POST | Enqueue note publish job |
| `/getPublishRecords` | GET | Publish history |

Full interactive docs: **`http://localhost:5409/api`** (Swagger).

More backend details: [`sau_backend_nest/README.md`](sau_backend_nest/README.md)

---

## Disclaimer

This tool automates third-party platforms via browser simulation. Use at your own risk. Comply with each platform's Terms of Service and local laws. The authors are not responsible for account restrictions or content policy violations.

---

## License

MIT License — see upstream [dreammis/social-auto-upload](https://github.com/dreammis/social-auto-upload) for reference.

If you publish this repo, consider adding a `LICENSE` file and retaining upstream attribution.

---

## Star & Contribute

Issues and PRs are welcome. Please do not commit secrets (`conf.ts`, `.env` with passwords) to public repos.
