import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';
import { staticPlugin } from '@elysiajs/static';
import dotenv from 'dotenv';

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

    // 只保留静态资源服务（用于访问 /var/anset/assets 下的图片）
    .use(staticPlugin({
        assets: '/var/anset/assets',
        prefix: '/static',
    }))

    // 健康检查接口
    .get('/', () => ({
        message: 'Anset Backend API',
        version: '1.0.0',
        status: 'running',
    }))

    .listen({
        hostname: HOST,
        port: PORT,
    });

console.log(`🦊 Anset Backend is running at http://${HOST}:${PORT}`);
