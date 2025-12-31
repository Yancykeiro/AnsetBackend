import { Elysia, t } from 'elysia';
import { prisma } from '../lib/prisma';

export const reportRoutes = new Elysia({ prefix: '/api/report' })

    // 创建新报告
    .post('/', async ({ body }) => {
        const { userId, roomType, budgetRange } = body;

        const report = await prisma.report.create({
            data: {
                userId,
                roomType,
                budgetRange,
                status: 'processing',
            },
        });

        return {
            success: true,
            data: report,
        };
    }, {
        body: t.Object({
            userId: t.String(),
            roomType: t.String(),
            budgetRange: t.String(),
        }),
    })

    // 获取报告详情
    .get('/:reportId', async ({ params }) => {
        const report = await prisma.report.findUnique({
            where: { id: params.reportId },
            include: {
                images: {
                    orderBy: { order: 'asc' },
                },
                survey: true,
                analysis: true,
            },
        });

        if (!report) {
            return {
                success: false,
                error: 'Report not found',
            };
        }

        return {
            success: true,
            data: report,
        };
    })

    // 获取用户的所有报告
    .get('/user/:userId', async ({ params, query }) => {
        const page = parseInt(query.page || '1');
        const limit = parseInt(query.limit || '10');
        const skip = (page - 1) * limit;

        const [reports, total] = await Promise.all([
            prisma.report.findMany({
                where: { userId: params.userId },
                include: {
                    images: {
                        take: 1,
                        orderBy: { order: 'asc' },
                    },
                    analysis: {
                        select: { summary: true },
                    },
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
            }),
            prisma.report.count({
                where: { userId: params.userId },
            }),
        ]);

        return {
            success: true,
            data: {
                reports,
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages: Math.ceil(total / limit),
                },
            },
        };
    })

    // 提交问卷
    .post('/:reportId/survey', async ({ params, body }) => {
        const survey = await prisma.survey.upsert({
            where: { reportId: params.reportId },
            update: {
                style: body.style,
                problems: body.problems,
                priority: body.priority,
                answers: body.answers,
            },
            create: {
                reportId: params.reportId,
                style: body.style,
                problems: body.problems,
                priority: body.priority,
                answers: body.answers,
            },
        });

        return {
            success: true,
            data: survey,
        };
    }, {
        body: t.Object({
            style: t.Optional(t.String()),
            problems: t.Optional(t.String()),
            priority: t.Optional(t.String()),
            answers: t.Optional(t.Any()),
        }),
    });
