import { Elysia, t } from 'elysia';
import { prisma } from '../lib/prisma';
import fs from 'fs/promises';
import path from 'path';

/**
 * 上传会话和图片上传路由
 * 
 * @description 处理用户上传图片前的会话创建和图片上传
 */
export const uploadRoutes = new Elysia({ prefix: '/api/upload' })

    /**
     * 创建上传会话
     * 
     * @route POST /api/upload/session
     * @description 用户选择房间类型和预算后，创建上传会话
     * 
     * @example
     * // 小程序调用:
     * const res = await wx.request({
     *   url: 'https://anset.top/api/upload/session',
     *   method: 'POST',
     *   data: {
     *     userId: 'user_xxx',
     *     roomType: '卫生间',
     *     budgetRange: '8000-15000元'
     *   }
     * });
     * const sessionId = res.data.data.sessionId;
     */
    .post('/session', async ({ body, set }) => {
        try {
            const { userId, roomType, budgetRange } = body;

            // 验证用户是否存在
            const user = await prisma.user.findUnique({
                where: { id: userId }
            });

            if (!user) {
                set.status = 404;
                return {
                    success: false,
                    error: 'User not found'
                };
            }

            // 创建上传会话
            const session = await prisma.uploadSession.create({
                data: {
                    userId,
                    roomType,
                    budgetRange,
                    status: 'uploading'
                }
            });

            console.log('[会话] 创建成功:', session.id);
            console.log('[会话] 房间类型:', roomType);
            console.log('[会话] 预算范围:', budgetRange);

            return {
                success: true,
                data: {
                    sessionId: session.id,
                    roomType: session.roomType,
                    budgetRange: session.budgetRange,
                    status: session.status,
                    createdAt: session.createdAt
                }
            };

        } catch (error) {
            console.error('[会话] 创建失败:', error);
            set.status = 500;
            return {
                success: false,
                error: 'Failed to create session',
                message: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }, {
        body: t.Object({
            userId: t.String(),
            roomType: t.String(),
            budgetRange: t.String()
        })
    })

    /**
     * 上传图片到会话
     * 
     * @route POST /api/upload/photo
     * @description 将拍摄的图片上传到指定会话
     * 
     * @example
     * // 小程序调用:
     * wx.uploadFile({
     *   url: 'https://anset.top/api/upload/photo',
     *   filePath: tempImagePath,
     *   name: 'photo',
     *   formData: {
     *     sessionId: 'session_xxx',
     *     type: '洗手池',
     *     order: 0
     *   }
     * });
     */
    .post('/photo', async ({ body, set }) => {
        try {
            const { photo, sessionId, type, order } = body;

            // 验证必填字段
            if (!photo || !sessionId || !type) {
                set.status = 400;
                return {
                    success: false,
                    error: 'photo, sessionId and type are required'
                };
            }

            // 验证会话是否存在
            const session = await prisma.uploadSession.findUnique({
                where: { id: sessionId }
            });

            if (!session) {
                set.status = 404;
                return {
                    success: false,
                    error: 'Session not found'
                };
            }

            // 验证文件类型
            if (!photo.type?.startsWith('image/')) {
                set.status = 400;
                return {
                    success: false,
                    error: 'Invalid file type, only images are allowed'
                };
            }

            console.log('[上传] 收到图片上传请求');
            console.log('[上传] 会话ID:', sessionId);
            console.log('[上传] 图片类型:', type);
            console.log('[上传] 文件大小:', (photo.size / 1024).toFixed(2), 'KB');

            // 生成文件名
            const ext = photo.name?.split('.').pop() || 'jpg';
            const timestamp = Date.now();
            const filename = `${type}_${timestamp}.${ext}`;

            // 保存到服务器
            const uploadDir = '/var/anset/assets/testcamera';
            const uploadPath = path.join(uploadDir, filename);

            await fs.mkdir(uploadDir, { recursive: true });

            const buffer = await photo.arrayBuffer();
            await fs.writeFile(uploadPath, Buffer.from(buffer));

            console.log('[上传] 文件已保存:', uploadPath);

            // 生成访问 URL
            const imageUrl = `https://anset.top/static/testcamera/${filename}`;

            // 保存到临时图片表
            const tempImage = await prisma.tempImage.create({
                data: {
                    sessionId,
                    url: imageUrl,
                    type,
                    order: order ?? 0,
                    filename,
                    fileSize: photo.size
                }
            });

            console.log('[上传] 临时图片已保存, ID:', tempImage.id);

            // 更新会话状态为 ready（可以开始分析）
            await prisma.uploadSession.update({
                where: { id: sessionId },
                data: { status: 'ready' }
            });

            return {
                success: true,
                data: {
                    imageId: tempImage.id,
                    url: imageUrl,
                    type,
                    order: tempImage.order,
                    filename,
                    size: photo.size,
                    uploadedAt: tempImage.createdAt
                }
            };

        } catch (error) {
            console.error('[上传] 图片上传失败:', error);
            set.status = 500;
            return {
                success: false,
                error: '图片上传失败，请重试',
                message: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }, {
        body: t.Object({
            photo: t.File({
                type: ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'],
                maxSize: 10485760
            }),
            sessionId: t.String(),
            type: t.String(),
            order: t.Optional(t.Number())
        })
    })

    /**
     * 获取会话的所有图片
     * 
     * @route GET /api/upload/session/:sessionId
     */
    .get('/session/:sessionId', async ({ params, set }) => {
        try {
            const session = await prisma.uploadSession.findUnique({
                where: { id: params.sessionId },
                include: {
                    images: {
                        orderBy: { order: 'asc' }
                    }
                }
            });

            if (!session) {
                set.status = 404;
                return {
                    success: false,
                    error: 'Session not found'
                };
            }

            return {
                success: true,
                data: {
                    sessionId: session.id,
                    roomType: session.roomType,
                    budgetRange: session.budgetRange,
                    status: session.status,
                    imageCount: session.images.length,
                    images: session.images
                }
            };

        } catch (error) {
            console.error('[会话] 查询失败:', error);
            set.status = 500;
            return {
                success: false,
                error: 'Failed to fetch session'
            };
        }
    });