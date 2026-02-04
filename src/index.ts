import { Elysia } from 'elysia'
import { cors } from '@elysiajs/cors'
import { staticPlugin } from '@elysiajs/static'
import * as https from 'https'
import * as fs from 'fs'
import { routes } from './routes'
import { prisma, disconnectPrisma } from './lib/prisma'

const PORT = Number(process.env.PORT) || 4010
const HOST = process.env.HOST || '0.0.0.0'
const NODE_ENV = process.env.NODE_ENV || 'development'

const app = new Elysia()
    // 配置 CORS(允许微信小程序访问)
    .use(
        cors({
            origin:
                process.env.NODE_ENV === 'production'
                    ? [
                        'https://anset.top', // 你的主域名
                        'https://www.anset.top', // www 子域名
                        'https://servicewechat.com', // 微信小程序开发者工具
                        /^https:\/\/.*\.servicewechat\.com$/ // 微信小程序所有子域名(正则匹配)
                    ]
                    : true,
            credentials: true,
            methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
            allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
            exposeHeaders: ['Content-Length', 'Content-Type']
        })
    )

    // 静态资源服务(用于访问 /var/anset/assets 下的图片)
    .use(
        staticPlugin({
            assets: '/var/anset/assets',
            prefix: '/static'
        })
    )
    .use(routes)
    .onError(({ code, error, set }) => {
        console.error('Error occurred:', code, error)
        set.status = code === 'NOT_FOUND' ? 404 : 500
        return {
            success: false,
            error: 'Internal server error'
        }
    })

/**
 * HTTPS 服务器配置
 *
 * @description 读取 SSL 证书并创建 HTTPS 服务器
 */
const httpsOptions = {
    key: fs.readFileSync(process.env.SSL_KEY_PATH || '/etc/ssl/anset/anset.top.key'),
    cert: fs.readFileSync(process.env.SSL_CERT_PATH || '/etc/ssl/anset/anset.top.pem')
}

/**
 * HTTPS 服务器包装器
 *
 * @description 将 Node.js HTTPS 请求转发到 Elysia 应用
 */
const server = https.createServer(httpsOptions, (req, res) => {
    const { method, url, headers } = req
    const chunks: Buffer[] = []

    req.on('data', (chunk: Buffer) => chunks.push(chunk))

    req.on('end', async () => {
        try {
            const body = Buffer.concat(chunks)
            const headersObj: Record<string, string> = {}

            // 转换 headers 为简单对象
            Object.entries(headers).forEach(([key, value]) => {
                if (value) {
                    headersObj[key] = Array.isArray(value) ? value[0] : value
                }
            })

            // 创建 Web 标准的 Request 对象
            const request = new Request(`https://localhost${url}`, {
                method,
                headers: headersObj,
                body: method === 'GET' || method === 'HEAD' ? undefined : body
            })

            // 由 Elysia 处理请求
            const response = await app.handle(request)
            res.writeHead(response.status, Object.fromEntries(response.headers))

            // 使用 arrayBuffer 保持二进制数据完整性(图片等静态资源)
            const responseBody = await response.arrayBuffer()
            res.end(Buffer.from(responseBody))
        } catch (error) {
            // 符合 API 设计原则的错误处理
            console.error('Server error:', error)
            res.writeHead(500, { 'Content-Type': 'application/json' })
            res.end(
                JSON.stringify({
                    success: false,
                    error: 'Internal server error'
                })
            )
        }
    })
})

server.listen(PORT, HOST, async () => {
    try {
        // 测试数据库连接
        await prisma.$connect()
        console.log('✅ Database connected successfully\n')
    } catch (error) {
        console.error('❌ Database connection failed:', error)
        process.exit(1)
    }

    console.log(`
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║   🏠 Anset Backend Service Started                          ║
║                                                              ║
║   🌐 Server:      https://${HOST}:${PORT}                           ║
║   📁 Static:      https://${HOST}:${PORT}/static/                   ║
║                                                              ║
║   🔧 Environment: ${NODE_ENV.padEnd(11)}                             ║
║   💾 Database:    Connected                                  ║
║   🔒 HTTPS:       Enabled                                    ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
    `)
})


// 确保在服务器关闭前正确释放资源
async function gracefulShutdown(signal: string): Promise<void> {
    console.log(`\n🛑 Received ${signal}, shutting down gracefully...`);

    try {
        // 关闭 HTTPS 服务器
        await new Promise<void>((resolve, reject) => {
            server.close((err) => {
                if (err) {
                    reject(err);
                } else {
                    console.log('✅ HTTPS server closed');
                    resolve();
                }
            });
        });

        // 断开数据库连接
        await disconnectPrisma();
        console.log('✅ Database connection closed');

        console.log('✅ Graceful shutdown completed');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error during shutdown:', error);
        process.exit(1);
    }
}

// 监听进程信号
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

// 未捕获的异常处理
process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error);
    gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
    gracefulShutdown('unhandledRejection');
});

export default app;