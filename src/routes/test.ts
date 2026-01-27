import { Elysia } from 'elysia';

/**
 * 测试路由
 * 
 * @description 用于验证小程序与后端连接的测试接口
 */
export const testRoutes = new Elysia({ prefix: '/api' })
    /**
     * 测试接口 - 用于验证小程序与后端的连接
     * 
     * @route GET /api/test
     * @returns {Object} 包含测试消息的响应
     */
    .get('/test', () => ({
        success: true,
        data: {
            message: '恭喜!小程序成功连接到 Anset 后端服务 🎉',
            timestamp: new Date().toISOString(),
        }
    }))

    /**
     * 测试接口 - 带参数示例
     * 
     * @route GET /api/test/:id
     * @param {string} id - 测试 ID
     * @returns {Object} 包含测试消息和 ID 的响应
     */
    .get('/test/:id', ({ params: { id } }) => ({
        success: true,
        data: {
            message: `测试 ID: ${id}`,
            id,
            timestamp: new Date().toISOString(),
        }
    }));