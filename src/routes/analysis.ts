import { Elysia, t } from 'elysia';
import { prisma } from '../lib/prisma';
import { analyzeImagesWithTongyi } from '../lib/tongyi';

export const analysisRoutes = new Elysia({ prefix: '/api/analysis' })

    // 开始分析（调用 AI）
    .post('/start/:reportId', async ({ params }) => {
        const reportId = params.reportId;

        // 获取报告信息
        const report = await prisma.report.findUnique({
            where: { id: reportId },
            include: {
                images: {
                    orderBy: { order: 'asc' },
                },
                survey: true,
            },
        });

        if (!report) {
            return {
                success: false,
                error: 'Report not found',
            };
        }

        if (report.images.length === 0) {
            return {
                success: false,
                error: 'No images uploaded',
            };
        }

        try {
            // 更新报告状态为处理中
            await prisma.report.update({
                where: { id: reportId },
                data: { status: 'processing' },
            });

            // 构建完整的图片 URL（需要加上服务器地址）
            const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
            const imageUrls = report.images.map(img => `${baseUrl}${img.url}`);

            // 调用通义千问分析
            const analysisResult = await analyzeImagesWithTongyi({
                images: imageUrls,
                roomType: report.roomType,
                budgetRange: report.budgetRange,
                surveyAnswers: report.survey?.answers,
            });

            // 保存分析结果
            const analysis = await prisma.analysis.create({
                data: {
                    reportId,
                    summary: analysisResult.summary,
                    problems: analysisResult.problems,
                    suggestions: analysisResult.suggestions,
                    materials: analysisResult.materials,
                    estimatedCost: analysisResult.estimatedCost,
                    rawResponse: analysisResult.rawResponse,
                },
            });

            // 更新报告状态为已完成
            await prisma.report.update({
                where: { id: reportId },
                data: { status: 'completed' },
            });

            return {
                success: true,
                data: analysis,
            };

        } catch (error) {
            // 更新报告状态为失败
            await prisma.report.update({
                where: { id: reportId },
                data: { status: 'failed' },
            });

            console.error('Analysis failed:', error);

            return {
                success: false,
                error: 'Analysis failed',
                message: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    })

    // 获取分析结果
    .get('/:reportId', async ({ params }) => {
        const analysis = await prisma.analysis.findUnique({
            where: { reportId: params.reportId },
            include: {
                report: {
                    include: {
                        images: true,
                        survey: true,
                    },
                },
            },
        });

        if (!analysis) {
            return {
                success: false,
                error: 'Analysis not found',
            };
        }

        return {
            success: true,
            data: analysis,
        };
    });


