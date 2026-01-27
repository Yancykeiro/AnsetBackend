import { Elysia, t } from 'elysia';

/**
 * 房间相关路由
 * 
 * @description 处理房间数据的增删改查
 */
export const roomRoutes = new Elysia({ prefix: '/api/rooms' })
    /**
     * 获取所有房间列表
     * 
     * @route GET /api/rooms
     * @returns {Object} 房间列表
     */
    .get('/', async () => {
        try {
            // TODO: 从数据库查询
            const rooms = [
                { id: 1, name: '卧室', type: 'bedroom' },
                { id: 2, name: '客厅', type: 'living_room' },
            ];

            return {
                success: true,
                data: rooms
            };
        } catch (error) {
            console.error('获取房间列表失败:', error);
            return {
                success: false,
                error: '获取房间列表失败'
            };
        }
    })

    /**
     * 获取单个房间详情
     * 
     * @route GET /api/rooms/:id
     * @param {string} id - 房间 ID
     * @returns {Object} 房间详情
     */
    .get('/:id', async ({ params: { id } }) => {
        try {
            // TODO: 从数据库查询
            const room = {
                id: parseInt(id),
                name: '卧室',
                type: 'bedroom',
                image: '/static/rooms/bedroom.png'
            };

            return {
                success: true,
                data: room
            };
        } catch (error) {
            console.error('获取房间详情失败:', error);
            return {
                success: false,
                error: '获取房间详情失败'
            };
        }
    }, {
        params: t.Object({
            id: t.String()
        })
    })

    /**
     * 创建新房间
     * 
     * @route POST /api/rooms
     * @body {Object} 房间信息
     * @returns {Object} 创建的房间数据
     */
    .post('/', async ({ body }) => {
        try {
            // TODO: 保存到数据库
            const newRoom = {
                id: Date.now(),
                ...body,
                createdAt: new Date().toISOString()
            };

            return {
                success: true,
                data: newRoom
            };
        } catch (error) {
            console.error('创建房间失败:', error);
            return {
                success: false,
                error: '创建房间失败'
            };
        }
    }, {
        body: t.Object({
            name: t.String(),
            type: t.String(),
        })
    });