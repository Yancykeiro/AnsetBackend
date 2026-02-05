import { Elysia, t } from 'elysia';
import { prisma } from '../lib/prisma';

export const userRoutes = new Elysia({ prefix: '/api/user' })

    // 用户登录/注册（通过微信小程序 openId）
    .post('/login', async ({ body }) => {
        const { openId, nickName, avatarUrl } = body;

        // 查找或创建用户
        let user = await prisma.user.findUnique({
            where: { openId },
        });

        if (!user) {
            user = await prisma.user.create({
                data: {
                    openId,
                    nickName,
                    avatarUrl,
                },
            });
        } else if (nickName || avatarUrl) {
            // 更新用户信息
            user = await prisma.user.update({
                where: { openId },
                data: {
                    nickName: nickName || user.nickName,
                    avatarUrl: avatarUrl || user.avatarUrl,
                },
            });
        }

        return {
            success: true,
            data: {
                userId: user.id,
                user,
            },
        };
    }, {
        body: t.Object({
            openId: t.String(),
            nickName: t.Optional(t.String()),
            avatarUrl: t.Optional(t.String()),
        }),
    })

    // 获取用户信息
    .get('/:userId', async ({ params }) => {
        const user = await prisma.user.findUnique({
            where: { id: params.userId },
            include: {
                reports: {
                    orderBy: { createdAt: 'desc' },
                    take: 10,
                },
            },
        });

        if (!user) {
            return {
                success: false,
                error: 'User not found',
            };
        }

        return {
            success: true,
            data: user,
        };
    });




