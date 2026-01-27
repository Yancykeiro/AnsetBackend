import { Elysia } from 'elysia';

/**
 * 健康检查路由
 * 
 * @description 提供系统状态检查接口
 */
export const healthRoutes = new Elysia({ prefix: '/' })
    /**
     * 健康检查接口
     * 
     * @route GET /
     * @returns {Object} 系统运行状态信息
     */
    .get('/', () => ({
        success: true,
        data: {
            message: 'Anset Backend API',
            version: '1.0.0',
            status: 'running',
            timestamp: new Date().toISOString(),
        }
    }));