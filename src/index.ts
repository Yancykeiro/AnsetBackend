import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';
import { staticPlugin } from '@elysiajs/static';
import dotenv from 'dotenv';

// 导入路由
import { userRoutes } from './routes/user';
import { reportRoutes } from './routes/report';
import { uploadRoutes } from './routes/upload';
import { analysisRoutes } from './routes/analysis';

// 加载环境变量
dotenv.config();

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

const app = new Elysia()
    // 配置 CORS（允许微信小程序访问）
    .use(cors({
        origin: true, // 开发环境允许所有来源，生产环境应该配置具体域名
        credentials: true,
    }))

    // 静态文件服务（用于访问上传的图片）
    .use(staticPlugin({
        assets: process.env.UPLOAD_DIR || './uploads',
        prefix: '/uploads',
    }))

    // 新增静态资源服务（用于访问 /var/anset/assets 下的图片）
    .use(staticPlugin({
        assets: '/var/anset/assets',
        prefix: '/static',
    }))

    // 健康检查
    .get('/', () => ({
        message: 'Anset Backend API',
        version: '1.0.0',
        status: 'running',
    }))

    .get('/health', () => ({
        status: 'ok',
        timestamp: new Date().toISOString(),
    }))

    // 注册路由
    .use(userRoutes)
    .use(reportRoutes)
    .use(uploadRoutes)
    .use(analysisRoutes)

    // 错误处理
    .onError(({ code, error, set }) => {
        console.error('Error:', error);

        if (code === 'NOT_FOUND') {
            set.status = 404;
            return { error: 'Route not found' };
        }

        set.status = 500;
        return {
            error: 'Internal server error',
            message: error.message
        };
    })

    .listen({
        hostname: HOST,
        port: PORT,
    });

console.log(`🦊 Anset Backend is running at http://${HOST}:${PORT}`);
