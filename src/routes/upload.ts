import { Elysia, t } from 'elysia';
import { prisma } from '../lib/prisma';
import { promises as fs } from 'fs';
import path from 'path';

const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads';

export const uploadRoutes = new Elysia({ prefix: '/api/upload' })

    // 上传图片
    .post('/image', async ({ body }) => {
        const { reportId, file, order } = body;

        // 确保上传目录存在
        await fs.mkdir(UPLOAD_DIR, { recursive: true });

        // 生成唯一文件名
        const ext = path.extname(file.name || '.jpg');
        const filename = `${Date.now()}-${Math.random().toString(36).substring(7)}${ext}`;
        const filepath = path.join(UPLOAD_DIR, filename);

        // 保存文件
        const buffer = await file.arrayBuffer();
        await fs.writeFile(filepath, Buffer.from(buffer));

        // 保存到数据库
        const image = await prisma.image.create({
            data: {
                reportId,
                url: `/uploads/${filename}`,
                order: order || 0,
            },
        });

        return {
            success: true,
            data: image,
        };
    }, {
        body: t.Object({
            reportId: t.String(),
            file: t.File(),
            order: t.Optional(t.Number()),
        }),
    })

    // 批量上传图片
    .post('/images/batch', async ({ body }) => {
        const { reportId, files } = body;

        await fs.mkdir(UPLOAD_DIR, { recursive: true });

        const images = await Promise.all(
            files.map(async (file, index) => {
                const ext = path.extname(file.name || '.jpg');
                const filename = `${Date.now()}-${index}${ext}`;
                const filepath = path.join(UPLOAD_DIR, filename);

                const buffer = await file.arrayBuffer();
                await fs.writeFile(filepath, Buffer.from(buffer));

                return prisma.image.create({
                    data: {
                        reportId,
                        url: `/uploads/${filename}`,
                        order: index,
                    },
                });
            })
        );

        return {
            success: true,
            data: images,
        };
    }, {
        body: t.Object({
            reportId: t.String(),
            files: t.Array(t.File()),
        }),
    })

    // 获取报告的所有图片
    .get('/report/:reportId', async ({ params }) => {
        const images = await prisma.image.findMany({
            where: { reportId: params.reportId },
            orderBy: { order: 'asc' },
        });

        return {
            success: true,
            data: images,
        };
    });
