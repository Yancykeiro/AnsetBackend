import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';
import { staticPlugin } from '@elysiajs/static';
import * as https from 'https';
import * as fs from 'fs';
import * as path from 'path';

const PORT = 4010;
const HOST = '0.0.0.0';

const app = new Elysia()
    // 配置 CORS(允许微信小程序访问)
    .use(cors({
        origin: process.env.NODE_ENV === 'production'
            ? ['https://anset.top']
            : true,
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
        exposeHeaders: ['Content-Length', 'Content-Type'],
    }))

    // 静态资源服务(用于访问 /var/anset/assets 下的图片)
    .use(staticPlugin({
        assets: '/var/anset/assets',
        prefix: '/static',
    }))

    // 健康检查接口
    .get('/', () => ({
        success: true,
        data: {
            message: 'Anset Backend API',
            version: '1.0.0',
            status: 'running',
        }
    }))
    /**
       * 测试接口 - 用于验证小程序与后端的连接
       * 
       * @route GET /api/test
       * @returns {Object} 包含测试消息的响应
       */
    .get('/api/test', () => ({
        success: true,
        data: {
            message: '恭喜!小程序成功连接到 Anset 后端服务 🎉',
            timestamp: new Date().toISOString(),
        }
    }))
    // 错误处理中间件
    .onError(({ code, error, set }) => {
        console.error('Error occurred:', code, error);
        set.status = code === 'NOT_FOUND' ? 404 : 500;
        return {
            success: false,
            error: 'Internal server error'
        };
    });

/**
 * HTTPS 服务器配置
 * 
 * @description 读取 SSL 证书并创建 HTTPS 服务器
 */
const httpsOptions = {
    key: fs.readFileSync(process.env.SSL_KEY_PATH || '/etc/ssl/anset/anset.top.key'),
    cert: fs.readFileSync(process.env.SSL_CERT_PATH || '/etc/ssl/anset/anset.top.pem')
};

/**
 * HTTPS 服务器包装器
 * 
 * @description 将 Node.js HTTPS 请求转发到 Elysia 应用
 */
const server = https.createServer(httpsOptions, (req, res) => {
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
            const request = new Request(`https://localhost${url}`, {
                method,
                headers: headersObj,
                body: method === 'GET' || method === 'HEAD' ? undefined : body
            });

            // 由 Elysia 处理请求
            const response = await app.handle(request);
            res.writeHead(response.status, Object.fromEntries(response.headers));

            // 使用 arrayBuffer 保持二进制数据完整性(图片等静态资源)
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
    console.log(`🦊 Elysia HTTPS server is running on https://${HOST}:${PORT}`);
});