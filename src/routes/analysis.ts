// import { Elysia, t } from 'elysia';
// import { prisma } from '../lib/prisma';
// import { analyzeImagesWithTongyi } from '../lib/tongyi';

// /**
//  * 分析路由
//  * 
//  * @description 处理 AI 图片分析和报告生成
//  */
// export const analysisRoutes = new Elysia({ prefix: '/api/analysis' })

//     /**
//      * 开始分析（调用 AI）
//      * 
//      * @route POST /api/analysis/start/:reportId
//      * @description 获取报告的所有图片，调用通义千问 AI 进行分析
//      */
//     .post('/start/:reportId', async ({ params, set }) => {
//         const { reportId } = params;

//         try {
//             // 获取报告信息（包含图片关联）
//             const report = await prisma.report.findUnique({
//                 where: { id: reportId },
//                 include: {
//                     images: {
//                         orderBy: { order: 'asc' },
//                     },
//                 },
//             });

//             // 验证报告是否存在
//             if (!report) {
//                 set.status = 404;
//                 return {
//                     success: false,
//                     error: 'Report not found',
//                 };
//             }

//             // 验证是否有上传的图片
//             if (report.images.length === 0) {
//                 set.status = 400;
//                 return {
//                     success: false,
//                     error: 'No images uploaded',
//                 };
//             }

//             // 更新报告状态为处理中
//             await prisma.report.update({
//                 where: { id: reportId },
//                 data: { status: 'analyzing' },
//             });

//             console.log(`[分析] 开始分析报告: ${reportId}, 图片数量: ${report.images.length}`);

//             // 构建完整的图片 URL
//             const baseUrl = process.env.BASE_URL || 'https://anset.top';
//             const imageUrls = report.images.map((img) => `${baseUrl}${img.url}`);

//             // 解析 surveyData（如果存在）
//             const surveyAnswers = report.surveyData
//                 ? (report.surveyData as Record<string, any>)
//                 : undefined;

//             // 调用通义千问分析
//             const analysisResult = await analyzeImagesWithTongyi({
//                 images: imageUrls,
//                 roomType: report.roomType,
//                 budgetRange: report.budgetRange,
//                 surveyAnswers,
//             });

//             console.log(`[分析] AI 分析完成: ${reportId}`);

//             // 保存分析结果到数据库
//             const analysis = await prisma.analysis.create({
//                 data: {
//                     reportId,
//                     summary: analysisResult.summary,
//                     totalCost: analysisResult.estimatedCost || report.budgetRange,
//                     priority: analysisResult.priority || 'medium',
//                     rawResponse: analysisResult.rawResponse as any, // Prisma Json 类型
//                 },
//             });

//             // 更新报告状态为已完成
//             await prisma.report.update({
//                 where: { id: reportId },
//                 data: { status: 'completed' },
//             });

//             console.log(`[分析] 报告分析完成: ${reportId}`);

//             return {
//                 success: true,
//                 data: {
//                     analysisId: analysis.id,
//                     summary: analysis.summary,
//                     totalCost: analysis.totalCost,
//                     priority: analysis.priority,
//                 },
//             };

//         } catch (error) {
//             console.error('[分析] 分析失败:', error);

//             // 更新报告状态为失败
//             try {
//                 await prisma.report.update({
//                     where: { id: reportId },
//                     data: { status: 'failed' },
//                 });
//             } catch (updateError) {
//                 console.error('[分析] 更新报告状态失败:', updateError);
//             }

//             set.status = 500;
//             return {
//                 success: false,
//                 error: 'Analysis failed',
//                 details: error instanceof Error ? error.message : 'Unknown error',
//             };
//         }
//     })

//     /**
//      * 获取分析结果
//      * 
//      * @route GET /api/analysis/:reportId
//      * @description 获取指定报告的完整分析结果
//      */
//     .get('/:reportId', async ({ params, set }) => {
//         try {
//             const analysis = await prisma.analysis.findUnique({
//                 where: { reportId: params.reportId },
//                 include: {
//                     report: {
//                         include: {
//                             images: {
//                                 include: {
//                                     analysis: true, // 包含每张图片的分析
//                                 },
//                                 orderBy: { order: 'asc' },
//                             },
//                             user: {
//                                 select: {
//                                     id: true,
//                                     nickName: true,
//                                     avatarUrl: true,
//                                 },
//                             },
//                         },
//                     },
//                 },
//             });

//             if (!analysis) {
//                 set.status = 404;
//                 return {
//                     success: false,
//                     error: 'Analysis not found',
//                 };
//             }

//             return {
//                 success: true,
//                 data: {
//                     analysis: {
//                         id: analysis.id,
//                         summary: analysis.summary,
//                         totalCost: analysis.totalCost,
//                         priority: analysis.priority,
//                         createdAt: analysis.createdAt,
//                     },
//                     report: {
//                         id: analysis.report.id,
//                         roomType: analysis.report.roomType,
//                         budgetRange: analysis.report.budgetRange,
//                         status: analysis.report.status,
//                         hasSurvey: analysis.report.hasSurvey,
//                         surveyData: analysis.report.surveyData,
//                         createdAt: analysis.report.createdAt,
//                     },
//                     images: analysis.report.images.map((img) => ({
//                         id: img.id,
//                         url: img.url,
//                         type: img.type,
//                         order: img.order,
//                         analysis: img.analysis ? {
//                             riskTitle: img.analysis.riskTitle,
//                             riskAnalysis: img.analysis.riskAnalysis,
//                             renovation: img.analysis.renovation,
//                             priority: img.analysis.priority,
//                         } : null,
//                     })),
//                     user: analysis.report.user,
//                 },
//             };

//         } catch (error) {
//             console.error('[分析] 获取分析结果失败:', error);
//             set.status = 500;
//             return {
//                 success: false,
//                 error: 'Failed to get analysis',
//             };
//         }
//     })

//     /**
//      * 获取用户的所有分析报告列表
//      * 
//      * @route GET /api/analysis/user/:userId
//      * @description 获取指定用户的所有分析报告
//      */
//     .get('/user/:userId', async ({ params, set }) => {
//         try {
//             const reports = await prisma.report.findMany({
//                 where: {
//                     userId: params.userId,
//                     status: 'completed', // 只返回已完成的报告
//                 },
//                 include: {
//                     analysis: {
//                         select: {
//                             id: true,
//                             summary: true,
//                             totalCost: true,
//                             priority: true,
//                             createdAt: true,
//                         },
//                     },
//                     images: {
//                         select: {
//                             id: true,
//                             url: true,
//                             type: true,
//                         },
//                         take: 1, // 只取第一张图片作为缩略图
//                     },
//                 },
//                 orderBy: {
//                     createdAt: 'desc',
//                 },
//             });

//             return {
//                 success: true,
//                 data: {
//                     reports: reports.map((report) => ({
//                         id: report.id,
//                         roomType: report.roomType,
//                         budgetRange: report.budgetRange,
//                         status: report.status,
//                         createdAt: report.createdAt,
//                         thumbnail: report.images[0]?.url || null,
//                         analysis: report.analysis,
//                     })),
//                     total: reports.length,
//                 },
//             };

//         } catch (error) {
//             console.error('[分析] 获取用户报告列表失败:', error);
//             set.status = 500;
//             return {
//                 success: false,
//                 error: 'Failed to get reports',
//             };
//         }
//     });