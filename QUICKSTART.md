# Anset Backend 快速入门指南

## ✅ 项目已创建完成！

你的 Elysiajs 后端项目已经成功创建。以下是后续步骤：

## 📋 下一步操作

### 1. 配置数据库

编辑 `.env` 文件，设置数据库连接：

```env
# PostgreSQL 示例
DATABASE_URL="postgresql://username:password@localhost:5432/anset?schema=public"

# 或 MySQL
DATABASE_URL="mysql://username:password@localhost:3306/anset"
```

### 2. 配置通义千问 API

在 `.env` 文件中填写你的阿里云通义千问 API Key：

```env
TONGYI_API_KEY=sk-你的API密钥
```

**如何获取 API Key：**

1. 访问 https://dashscope.console.aliyun.com/
2. 登录阿里云账号
3. 进入 API-KEY 管理页面
4. 创建新的 API Key

### 3. 初始化数据库

```bash
npm run db:push
```

这会创建数据库表结构。

### 4. 启动开发服务器

```bash
npm run dev
```

或者在 VS Code 中：

-   按 `Ctrl+Shift+B` (Windows) 或 `Cmd+Shift+B` (Mac)
-   选择 "运行开发服务器"

服务器将在 http://localhost:3000 启动。

### 5. 测试 API

访问 http://localhost:3000 查看服务状态：

```json
{
    "message": "Anset Backend API",
    "version": "1.0.0",
    "status": "running"
}
```

## 📡 API 端点

### 用户管理

-   `POST /api/user/login` - 用户登录/注册
-   `GET /api/user/:userId` - 获取用户信息

### 报告管理

-   `POST /api/report` - 创建报告
-   `GET /api/report/:reportId` - 获取报告详情
-   `GET /api/report/user/:userId` - 获取用户所有报告
-   `POST /api/report/:reportId/survey` - 提交问卷

### 文件上传

-   `POST /api/upload/image` - 上传单张图片
-   `POST /api/upload/images/batch` - 批量上传图片

### AI 分析

-   `POST /api/analysis/start/:reportId` - 开始 AI 分析
-   `GET /api/analysis/:reportId` - 获取分析结果

## 🔧 开发命令

```bash
# 开发模式（热重载）
npm run dev

# 构建生产版本
npm run build

# 启动生产服务
npm start

# 数据库操作
npm run db:generate  # 生成 Prisma Client
npm run db:push      # 推送数据库模式
npm run db:studio    # 打开数据库管理界面
```

## 📱 前端集成示例

在微信小程序中调用后端 API：

```javascript
// 用户登录
wx.request({
    url: 'http://your-server.com/api/user/login',
    method: 'POST',
    data: {
        openId: 'wx_open_id',
        nickName: '用户昵称',
        avatarUrl: '头像URL'
    },
    success: res => {
        console.log(res.data)
    }
})

// 上传图片
wx.chooseImage({
    success: res => {
        wx.uploadFile({
            url: 'http://your-server.com/api/upload/image',
            filePath: res.tempFilePaths[0],
            name: 'file',
            formData: {
                reportId: 'report_id',
                order: 1
            }
        })
    }
})
```

## 🌐 部署到阿里云

### 1. 准备服务器

-   购买阿里云 ECS 服务器
-   安装 Node.js 18+
-   安装 PostgreSQL 或 MySQL

### 2. 上传代码

```bash
git clone your-repo-url
cd anset-backend
npm install
```

### 3. 配置环境变量

```bash
# 编辑 .env
nano .env
```

### 4. 初始化数据库

```bash
npm run db:push
```

### 5. 使用 PM2 管理进程

```bash
npm install -g pm2
npm run build
pm2 start dist/index.js --name anset-backend
pm2 startup
pm2 save
```

### 6. 配置 Nginx（可选）

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

## 📝 注意事项

1. **数据库连接**：确保数据库服务已启动
2. **API Key**：通义千问 API 有调用次数限制，请注意配额
3. **文件上传**：确保 `uploads` 目录有写入权限
4. **CORS**：生产环境需要配置允许的域名
5. **安全性**：生产环境请使用 HTTPS

## 🐛 常见问题

### 数据库连接失败

-   检查 DATABASE_URL 是否正确
-   确认数据库服务已启动
-   检查防火墙设置

### AI 分析失败

-   检查 TONGYI_API_KEY 是否正确
-   确认 API 配额是否充足
-   查看错误日志

### 文件上传失败

-   检查 uploads 目录权限
-   确认文件大小未超过限制

## 📚 相关资源

-   [Elysiajs 文档](https://elysiajs.com/)
-   [Prisma 文档](https://www.prisma.io/docs)
-   [通义千问 API 文档](https://help.aliyun.com/zh/dashscope/)
-   [微信小程序开发文档](https://developers.weixin.qq.com/miniprogram/dev/framework/)

祝开发顺利！🎉
