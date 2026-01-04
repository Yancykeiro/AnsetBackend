import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';
import { staticPlugin } from '@elysiajs/static';
// import dotenv from 'dotenv';
import * as http from 'http';


// 加载环境变量
// dotenv.config();

// const PORT = process.env.PORT || 3000;
// const HOST = process.env.HOST || '0.0.0.0';
const PORT = 4010;
const HOST = '0.0.0.0';

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


const server = http.createServer((req, res) => {
    const { method, url, headers } = req;
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', async () => {
        const body = Buffer.concat(chunks);
        const headersObj: Record<string, string> = {};
        Object.entries(headers).forEach(([key, value]) => {
            if (value) {
                headersObj[key] = Array.isArray(value) ? value[0] : value;
            }
        });

        const request = new Request(`http://localhost${url}`, {
            method,
            headers: headersObj,
            body: method === 'GET' || method === 'HEAD' ? undefined : body
        });
        const response = await app.handle(request);
        res.writeHead(response.status, Object.fromEntries(response.headers));
        res.end(await response.text());
    });
});

server.listen({ port: PORT, host: HOST }, () => {
    console.log(`Elysia server is running on http://${HOST}:${PORT}`);
});
