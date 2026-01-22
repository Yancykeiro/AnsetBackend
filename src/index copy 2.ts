import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';
import { staticPlugin } from '@elysiajs/static';
import * as http from 'http';

const PORT = 4010;
const HOST = '0.0.0.0';

const app = new Elysia()
    // 配置 CORS（允许微信小程序访问）
    .use(cors({
        origin: process.env.NODE_ENV === 'production'
            ? ['https://anset.top']
            : true, // 开发环境允许所有来源
        credentials: true,
    }))

    // 静态资源服务（用于访问 /var/anset/assets 下的图片）
    .use(staticPlugin({
        assets: '/var/anset/assets',
        prefix: '/static',
    }))

    // 健康检查接口 - 使用一致的响应格式
    .get('/', () => ({
        success: true,
        data: {
            message: 'Anset Backend API',
            version: '1.0.0',
            status: 'running',
        }
    }))

    // 错误处理中间件 - 符合 API 设计原则
    .onError(({ code, error, set }) => {
        console.error('Error occurred:', code, error);
        set.status = code === 'NOT_FOUND' ? 404 : 500;
        return {
            success: false,
            error: 'Internal server error'
        };
    });

/**
 * HTTP 服务器包装器
 * 
 * @description 将 Node.js HTTP 请求转发到 Elysia 应用
 * 使用 http.createServer 包装以确保兼容性
 */
const server = http.createServer((req, res) => {
    const { method, url, headers } = req;
    const chunks: Buffer[] = [];

    req.on('data', (chunk: Buffer) => chunks.push(chunk));

    req.on('end', async () => {
        try {
            const body = Buffer.concat(chunks);
            const headersObj: Record<string, string> = {};

            // 转换 headers 为简单对象
            Object.entries(headers).forEach(([key, value]) => {
                if (value) {
                    headersObj[key] = Array.isArray(value) ? value[0] : value;
                }
            });

            // 创建 Web 标准的 Request 对象
            const request = new Request(`http://localhost${url}`, {
                method,
                headers: headersObj,
                body: method === 'GET' || method === 'HEAD' ? undefined : body
            });

            // 由 Elysia 处理请求
            const response = await app.handle(request);
            res.writeHead(response.status, Object.fromEntries(response.headers));

            // 使用 arrayBuffer 保持二进制数据完整性（图片等静态资源）
            const responseBody = await response.arrayBuffer();
            res.end(Buffer.from(responseBody));
        } catch (error) {
            // 符合 API 设计原则的错误处理
            console.error('Server error:', error);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                success: false,
                error: 'Internal server error'
            }));
        }
    });
});

server.listen(PORT, HOST, () => {
    console.log(`🦊 Elysia server is running on http://${HOST}:${PORT}`);
});

