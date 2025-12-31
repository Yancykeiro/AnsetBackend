# Anset Backend - 家居改造建议小程序后端

基于 Elysiajs 构建的高性能 TypeScript 后端服务，集成阿里云通义千问 AI，为微信小程序提供智能家居改造建议。

## 📋 功能特性

-   ✅ **用户管理**: 微信小程序用户登录和信息管理
-   ✅ **报告系统**: 创建和管理改造报告
-   ✅ **图片上传**: 支持单张和批量图片上传
-   ✅ **问卷调查**: 收集用户需求和偏好
-   ✅ **AI 分析**: 集成通义千问进行智能图片分析
-   ✅ **报告生成**: 生成详细的改造建议报告

## 🛠️ 技术栈

-   **框架**: Elysiajs 1.1+
-   **语言**: TypeScript 5.7+
-   **数据库**: Prisma ORM + PostgreSQL/MySQL
-   **AI 服务**: 阿里云通义千问 (DashScope API)
-   **运行时**: Node.js 18+ (推荐使用 Bun)

## 📦 项目结构

```
anset-backend/
├── src/
│   ├── index.ts           # 应用入口
│   ├── lib/
│   │   ├── prisma.ts      # Prisma 客户端
│   │   └── tongyi.ts      # 通义千问 AI 集成
│   └── routes/
│       ├── user.ts        # 用户相关路由
│       ├── report.ts      # 报告相关路由
│       ├── upload.ts      # 文件上传路由
│       └── analysis.ts    # AI 分析路由
├── prisma/
│   └── schema.prisma      # 数据库模型定义
├── uploads/               # 上传文件存储目录
├── .env                   # 环境变量配置
├── package.json
└── tsconfig.json
```

## 🚀 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

复制 `.env.example` 为 `.env` 并填写配置：

```env
# 数据库连接
DATABASE_URL="postgresql://user:password@localhost:5432/anset"

# 服务器配置
PORT=3000
HOST=0.0.0.0

# 通义千问 API
TONGYI_API_KEY=your_api_key_here

# 文件上传
UPLOAD_DIR=./uploads
```

### 3. 初始化数据库

```bash
# 生成 Prisma Client
npm run db:generate

# 推送数据库模式
npm run db:push
```

### 4. 启动开发服务器

```bash
npm run dev
```

服务器将在 `http://localhost:3000` 启动。

## 📡 API 文档

### 用户接口

#### POST `/api/user/login`

用户登录/注册

**请求体:**

```json
{
    "openId": "wx_open_id",
    "nickName": "用户昵称",
    "avatarUrl": "头像URL"
}
```

#### GET `/api/user/:userId`

获取用户信息

### 报告接口

#### POST `/api/report`

创建新报告

**请求体:**

```json
{
    "userId": "user_id",
    "roomType": "卫生间",
    "budgetRange": "小于5000元"
}
```

#### GET `/api/report/:reportId`

获取报告详情

#### GET `/api/report/user/:userId`

获取用户的所有报告

#### POST `/api/report/:reportId/survey`

提交问卷

### 上传接口

#### POST `/api/upload/image`

上传单张图片

**请求体 (multipart/form-data):**

-   `reportId`: 报告 ID
-   `file`: 图片文件
-   `order`: 排序（可选）

#### POST `/api/upload/images/batch`

批量上传图片

### 分析接口

#### POST `/api/analysis/start/:reportId`

开始 AI 分析

#### GET `/api/analysis/:reportId`

获取分析结果

## 🔧 开发命令

```bash
# 开发模式（热重载）
npm run dev

# 构建生产版本
npm run build

# 启动生产服务器
npm start

# 数据库管理
npm run db:generate  # 生成 Prisma Client
npm run db:push      # 推送数据库模式
npm run db:studio    # 打开 Prisma Studio
```

## 🌐 部署到阿里云

### 1. 准备服务器

-   购买阿里云 ECS 服务器
-   安装 Node.js 18+ 或 Bun
-   安装 PostgreSQL 或 MySQL
-   配置防火墙开放 3000 端口

### 2. 上传代码

```bash
# 使用 Git
git clone your-repo-url
cd anset-backend

# 或使用 SCP/FTP 上传
```

### 3. 安装依赖并构建

```bash
npm install
npm run build
npm run db:push
```

### 4. 使用 PM2 管理进程

```bash
# 安装 PM2
npm install -g pm2

# 启动应用
pm2 start dist/index.js --name anset-backend

# 设置开机自启
pm2 startup
pm2 save
```

### 5. 配置 Nginx 反向代理（可选）

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## 📝 待办事项

-   [ ] 添加用户认证（JWT）
-   [ ] 实现 API 速率限制
-   [ ] 添加日志系统
-   [ ] 实现文件存储到对象存储（OSS）
-   [ ] 添加单元测试
-   [ ] 添加 API 文档（Swagger）
-   [ ] 优化 AI 提示词
-   [ ] 添加缓存层（Redis）

## 📄 许可证

ISC

## 👥 贡献

欢迎提交 Issue 和 Pull Request！
