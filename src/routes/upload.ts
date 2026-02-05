import { Elysia, t } from 'elysia';
import fs from 'fs/promises';
import path from 'path';
import { nanoid } from 'nanoid';

/**
 * 图片上传路由
 * 
 * @description 处理小程序图片上传，保存到服务器并返回 URL
 */
export const uploadRoutes = new Elysia({ prefix: '/api/upload' })

    /**
     * 上传图片
     * 
     * @route POST /api/upload/photo
     * @description 上传图片到服务器，返回访问 URL
     * 
     * @example
     * // 小程序调用:
     * wx.uploadFile({
     *   url: 'https://anset.top/api/upload/photo',
     *   filePath: tempImagePath,
     *   name: 'photo',
     *   success: (res) => {
     *     const data = JSON.parse(res.data);
     *     console.log('图片URL:', data.data.url);
     *   }
     * });
     */
    .post('/photo', async ({ body, set }) => {
        try {
            const { photo } = body;

            // 验证文件
            if (!photo) {
                set.status = 400;
                return {
                    success: false,
                    error: 'Photo file is required'
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
            console.log('[上传] 文件类型:', photo.type);
            console.log('[上传] 文件大小:', (photo.size / 1024).toFixed(2), 'KB');

            // 生成唯一文件名
            const ext = photo.name?.split('.').pop() || 'jpg';
            const uniqueId = nanoid(12);
            const timestamp = Date.now();
            const filename = `${timestamp}_${uniqueId}.${ext}`;

            // 保存到服务器指定目录
            const uploadDir = process.env.UPLOAD_DIR || '/var/anset/assets/testcamera';
            const uploadPath = path.join(uploadDir, filename);

            // 确保目录存在
            await fs.mkdir(uploadDir, { recursive: true });

            // 保存文件
            const buffer = await photo.arrayBuffer();
            await fs.writeFile(uploadPath, Buffer.from(buffer));

            console.log('[上传] 文件已保存:', uploadPath);

            // 生成访问 URL
            const baseUrl = process.env.BASE_URL || 'https://anset.top';
            const imageUrl = `${baseUrl}/static/testcamera/${filename}`;

            console.log('[上传] 访问URL:', imageUrl);

            return {
                success: true,
                data: {
                    url: imageUrl,
                    filename,
                    size: photo.size,
                    type: photo.type,
                    uploadedAt: new Date().toISOString()
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
                maxSize: 10485760 // 10MB
            })
        })
    })

    /**
     * 批量上传图片
     * 
     * @route POST /api/upload/photos
     * @description 一次上传多张图片
     */
    .post('/photos', async ({ body, set }) => {
        try {
            const { photos } = body;

            if (!photos || photos.length === 0) {
                set.status = 400;
                return {
                    success: false,
                    error: 'At least one photo is required'
                };
            }

            console.log('[批量上传] 收到请求，图片数量:', photos.length);

            const uploadDir = process.env.UPLOAD_DIR || '/var/anset/assets/testcamera';
            await fs.mkdir(uploadDir, { recursive: true });

            const baseUrl = process.env.BASE_URL || 'https://anset.top';
            const results = [];

            for (let i = 0; i < photos.length; i++) {
                const photo = photos[i];

                // 验证文件类型
                if (!photo.type?.startsWith('image/')) {
                    console.warn(`[批量上传] 跳过无效文件 ${i + 1}`);
                    continue;
                }

                // 生成文件名
                const ext = photo.name?.split('.').pop() || 'jpg';
                const uniqueId = nanoid(12);
                const timestamp = Date.now();
                const filename = `${timestamp}_${uniqueId}_${i}.${ext}`;
                const uploadPath = path.join(uploadDir, filename);

                // 保存文件
                const buffer = await photo.arrayBuffer();
                await fs.writeFile(uploadPath, Buffer.from(buffer));

                const imageUrl = `${baseUrl}/static/testcamera/${filename}`;

                results.push({
                    url: imageUrl,
                    filename,
                    size: photo.size,
                    type: photo.type,
                    order: i
                });

                console.log(`[批量上传] 文件 ${i + 1} 已保存:`, filename);
            }

            return {
                success: true,
                data: {
                    count: results.length,
                    images: results,
                    uploadedAt: new Date().toISOString()
                }
            };

        } catch (error) {
            console.error('[批量上传] 失败:', error);
            set.status = 500;
            return {
                success: false,
                error: '批量上传失败，请重试',
                message: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }, {
        body: t.Object({
            photos: t.Array(t.File({
                type: ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'],
                maxSize: 10485760
            }))
        })
    });