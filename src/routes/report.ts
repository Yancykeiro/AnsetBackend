import { Elysia, t } from 'elysia';
import { prisma } from '../lib/prisma';
import axios from 'axios';

/**
 * 报告生成路由
 * 
 * @description 处理报告的生成（两种场景）
 */
export const reportRoutes = new Elysia({ prefix: '/api/reports' })

    /**
     * 场景1: 直接生成报告（不填问卷）
     * 
     * @route POST /api/reports/generate
     * @description 用户上传完图片后，直接点击"生成报告"
     * 
     * @example
     * // 小程序调用:
     * wx.request({
     *   url: 'https://anset.top/api/reports/generate',
     *   method: 'POST',
     *   data: {
     *     sessionId: 'session_xxx'
     *   }
     * });
     */
    .post('/generate', async ({ body, set }) => {
        try {
            const { sessionId } = body;

            console.log('[报告] 开始生成报告（无问卷）');
            console.log('[报告] 会话ID:', sessionId);

            // 获取会话信息
            const session = await prisma.uploadSession.findUnique({
                where: { id: sessionId },
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

            if (session.images.length === 0) {
                set.status = 400;
                return {
                    success: false,
                    error: 'No images uploaded'
                };
            }

            console.log('[报告] 图片数量:', session.images.length);

            // 更新会话状态
            await prisma.uploadSession.update({
                where: { id: sessionId },
                data: { status: 'analyzing' }
            });

            // 创建报告
            const report = await prisma.report.create({
                data: {
                    userId: session.userId,
                    roomType: session.roomType,
                    budgetRange: session.budgetRange,
                    hasSurvey: false,
                    status: 'analyzing'
                }
            });

            console.log('[报告] 报告已创建, ID:', report.id);

            // 将临时图片转移到报告
            const imageData = session.images.map(img => ({
                reportId: report.id,
                url: img.url,
                type: img.type,
                order: img.order,
                filename: img.filename,
                fileSize: img.fileSize
            }));

            await prisma.image.createMany({
                data: imageData
            });

            console.log('[报告] 图片已转移');

            // 调用 AI 分析
            const analysisResult = await callBailianAgent({
                spaceType: session.roomType,
                budgetRange: session.budgetRange,
                images: session.images.map(img => ({
                    url: img.url,
                    type: img.type,
                    order: img.order
                })),
                surveyAnswers: null
            });

            console.log('[报告] AI 分析完成');

            // 保存分析结果
            await saveAnalysisResults(report.id, analysisResult);

            // 更新报告状态
            await prisma.report.update({
                where: { id: report.id },
                data: { status: 'completed' }
            });

            // 更新会话状态
            await prisma.uploadSession.update({
                where: { id: sessionId },
                data: { status: 'completed' }
            });

            console.log('[报告] 报告生成完成');

            // 返回完整报告
            const completeReport = await prisma.report.findUnique({
                where: { id: report.id },
                include: {
                    images: {
                        include: {
                            analysis: true
                        },
                        orderBy: { order: 'asc' }
                    },
                    analysis: true
                }
            });

            return {
                success: true,
                data: completeReport
            };

        } catch (error) {
            console.error('[报告] 生成失败:', error);
            set.status = 500;
            return {
                success: false,
                error: 'Failed to generate report',
                message: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }, {
        body: t.Object({
            sessionId: t.String()
        })
    })

    /**
     * 场景2: 填写问卷后生成报告
     * 
     * @route POST /api/reports/generate-with-survey
     * @description 用户填写问卷后，点击"生成报告"
     * 
     * @example
     * // 小程序调用:
     * wx.request({
     *   url: 'https://anset.top/api/reports/generate-with-survey',
     *   method: 'POST',
     *   data: {
     *     sessionId: 'session_xxx',
     *     surveyData: {
     *       '居住人数': '2人',
     *       '年龄段': '65岁以上',
     *       '是否有行动不便': '轻微不便'
     *     }
     *   }
     * });
     */
    .post('/generate-with-survey', async ({ body, set }) => {
        try {
            const { sessionId, surveyData } = body;

            console.log('[报告] 开始生成报告（含问卷）');
            console.log('[报告] 会话ID:', sessionId);

            // 获取会话信息
            const session = await prisma.uploadSession.findUnique({
                where: { id: sessionId },
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

            if (session.images.length === 0) {
                set.status = 400;
                return {
                    success: false,
                    error: 'No images uploaded'
                };
            }

            console.log('[报告] 图片数量:', session.images.length);
            console.log('[报告] 问卷数据:', surveyData);

            // 更新会话状态
            await prisma.uploadSession.update({
                where: { id: sessionId },
                data: { status: 'analyzing' }
            });

            // 创建报告（包含问卷）
            const report = await prisma.report.create({
                data: {
                    userId: session.userId,
                    roomType: session.roomType,
                    budgetRange: session.budgetRange,
                    hasSurvey: true,
                    surveyData,
                    status: 'analyzing'
                }
            });

            console.log('[报告] 报告已创建, ID:', report.id);

            // 转移图片
            const imageData = session.images.map(img => ({
                reportId: report.id,
                url: img.url,
                type: img.type,
                order: img.order,
                filename: img.filename,
                fileSize: img.fileSize
            }));

            await prisma.image.createMany({
                data: imageData
            });

            console.log('[报告] 图片已转移');

            // 调用 AI 分析（包含问卷数据）
            const analysisResult = await callBailianAgent({
                spaceType: session.roomType,
                budgetRange: session.budgetRange,
                images: session.images.map(img => ({
                    url: img.url,
                    type: img.type,
                    order: img.order
                })),
                surveyAnswers: surveyData
            });

            console.log('[报告] AI 分析完成');

            // 保存分析结果
            await saveAnalysisResults(report.id, analysisResult);

            // 更新报告状态
            await prisma.report.update({
                where: { id: report.id },
                data: { status: 'completed' }
            });

            // 更新会话状态
            await prisma.uploadSession.update({
                where: { id: sessionId },
                data: { status: 'completed' }
            });

            console.log('[报告] 报告生成完成');

            // 返回完整报告
            const completeReport = await prisma.report.findUnique({
                where: { id: report.id },
                include: {
                    images: {
                        include: {
                            analysis: true
                        },
                        orderBy: { order: 'asc' }
                    },
                    analysis: true
                }
            });

            return {
                success: true,
                data: completeReport
            };

        } catch (error) {
            console.error('[报告] 生成失败:', error);
            set.status = 500;
            return {
                success: false,
                error: 'Failed to generate report',
                message: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }, {
        body: t.Object({
            sessionId: t.String(),
            surveyData: t.Any()
        })
    })

    /**
     * 获取报告详情
     * 
     * @route GET /api/reports/:reportId
     */
    .get('/:reportId', async ({ params, set }) => {
        try {
            const report = await prisma.report.findUnique({
                where: { id: params.reportId },
                include: {
                    images: {
                        include: {
                            analysis: true
                        },
                        orderBy: { order: 'asc' }
                    },
                    analysis: true,
                    user: {
                        select: {
                            id: true,
                            nickName: true,
                            avatarUrl: true
                        }
                    }
                }
            });

            if (!report) {
                set.status = 404;
                return {
                    success: false,
                    error: 'Report not found'
                };
            }

            return {
                success: true,
                data: report
            };

        } catch (error) {
            console.error('[报告] 查询失败:', error);
            set.status = 500;
            return {
                success: false,
                error: 'Failed to fetch report'
            };
        }
    })

    /**
     * 获取用户的报告列表
     * 
     * @route GET /api/reports/user/:userId
     */
    .get('/user/:userId', async ({ params, query, set }) => {
        try {
            const { userId } = params;
            const page = parseInt(query.page as string) || 1;
            const pageSize = parseInt(query.pageSize as string) || 10;
            const skip = (page - 1) * pageSize;

            const [reports, total] = await Promise.all([
                prisma.report.findMany({
                    where: { userId },
                    include: {
                        images: {
                            take: 1,
                            orderBy: { order: 'asc' }
                        },
                        analysis: {
                            select: {
                                summary: true,
                                priority: true
                            }
                        }
                    },
                    orderBy: { createdAt: 'desc' },
                    skip,
                    take: pageSize
                }),
                prisma.report.count({
                    where: { userId }
                })
            ]);

            return {
                success: true,
                data: {
                    reports,
                    pagination: {
                        page,
                        pageSize,
                        total,
                        totalPages: Math.ceil(total / pageSize)
                    }
                }
            };

        } catch (error) {
            console.error('[报告] 查询列表失败:', error);
            set.status = 500;
            return {
                success: false,
                error: 'Failed to fetch reports'
            };
        }
    });

/**
 * 调用百炼智能体进行分析
 */
async function callBailianAgent(config: {
    spaceType: string;
    budgetRange: string;
    images: Array<{ url: string; type: string; order: number }>;
    surveyAnswers: any;
}) {
    const apiKey = process.env.DASHSCOPE_API_KEY || 'sk-8d870d21086549d584c50b1f1980d929';
    const appId = process.env.BAILIAN_APP_ID || '80cdc3bc489749398bf5f3055dd2ff2d';
    const url = `https://dashscope.aliyuncs.com/api/v1/apps/${appId}/completion`;

    const prompt = buildPrompt(config);

    const data = {
        input: {
            prompt,
            images: config.images.map(img => img.url)
        },
        parameters: {},
        debug: {}
    };

    console.log('[百炼] 调用 API...');
    console.log('[百炼] 图片数量:', config.images.length);
    console.log('[百炼] 是否有问卷:', !!config.surveyAnswers);

    const response = await axios.post(url, data, {
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
        },
        timeout: 120000
    });

    if (response.status !== 200) {
        throw new Error(`Bailian API error: ${response.status}`);
    }

    const resultText = response.data.output?.text || '';

    console.log('[百炼] API 调用成功');

    // 解析 JSON 结果
    const jsonMatch = resultText.match(/```json\s*([\s\S]*?)\s*```/) ||
        resultText.match(/\{[\s\S]*"recommendations"[\s\S]*\}/);

    if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[1] || jsonMatch[0]);
        return {
            ...parsed,
            rawResponse: response.data
        };
    }

    return {
        summary: resultText.substring(0, 500),
        recommendations: [],
        rawResponse: response.data
    };
}

/**
 * 构建 AI 提示词
 */
function buildPrompt(config: {
    spaceType: string;
    budgetRange: string;
    images: Array<{ type: string }>;
    surveyAnswers: any;
}) {
    const imageTypes = config.images.map(img => img.type);
    const imageDescriptions = imageTypes
        .map((type, idx) => `图片${idx + 1}(${type})`)
        .join('、');

    let surveyInfo = '';
    if (config.surveyAnswers) {
        surveyInfo = '\n\n## 用户需求\n';
        Object.entries(config.surveyAnswers).forEach(([key, value]) => {
            surveyInfo += `- ${key}: ${value}\n`;
        });
    }

    return `
## 角色
你是一名专业的居家养老空间规划师，根据知识库中的知识和老年人居住习惯，判断图片中的${config.spaceType}风险点，并提出改造建议。

## 任务说明
你的任务是判断图片中的风险并给出风险标题、风险原因和改造方法。

## 基本信息
- 空间类型: ${config.spaceType}
- 预算范围: ${config.budgetRange}
- 图片数量: ${config.images.length}张
- 图片说明: ${imageDescriptions}${surveyInfo}

## 分析要求

### 针对每张图片
请为每张图片单独识别风险点：
1. 仔细观察图片中的安全隐患（地面湿滑、空间狭窄、照明不足等）
2. 识别功能性问题（扶手缺失、高度不合理、收纳不便等）
3. 考虑老年人的特殊需求（行动不便、视力下降、反应迟缓等）

### 风险优先级
- 优先识别可能导致跌倒、碰撞等安全问题的风险
- 其次关注影响日常使用便利性的问题
- 最后考虑美观和舒适度提升

## 输出格式

### 严格按照以下 JSON 格式输出
\`\`\`json
{
  "recommendations": [
    {
      "image_index": 0,
      "image_type": "通道",
      "risk_title": "地面过于光滑",
      "risk_analysis": "瓷砖地面遇水易滑，老年人容易摔倒，可能造成骨折等严重后果。",
      "renovation_suggestion": "建议更换为**防滑瓷砖**或铺设**防滑地垫**，关键区域安装**L型扶手**。"
    }
  ]
}
\`\`\`

### 输出内容要求
1. **image_index**: 图片索引（0开始）
2. **image_type**: 图片类型（${imageTypes.join('、')}）
3. **risk_title**: 风险标题（10字以内）
4. **risk_analysis**: 风险原因（30字以内）
5. **renovation_suggestion**: 改造建议（50字以内），需购买物品用**加粗**

请基于知识库中的专业知识进行分析。
`.trim();
}

/**
 * 保存分析结果到数据库
 */
async function saveAnalysisResults(reportId: string, analysisResult: any) {
    // 保存整体分析
    await prisma.analysis.create({
        data: {
            reportId,
            summary: analysisResult.summary || '分析完成',
            totalCost: analysisResult.totalCost,
            priority: analysisResult.priority,
            rawResponse: analysisResult.rawResponse
        }
    });

    // 获取报告的图片
    const images = await prisma.image.findMany({
        where: { reportId },
        orderBy: { order: 'asc' }
    });

    // 保存每张图片的分析
    if (analysisResult.recommendations) {
        await Promise.all(
            analysisResult.recommendations.map(async (rec: any) => {
                const image = images[rec.image_index];
                if (!image) return null;

                return prisma.imageAnalysis.create({
                    data: {
                        imageId: image.id,
                        riskTitle: rec.risk_title,
                        riskAnalysis: rec.risk_analysis,
                        renovation: rec.renovation_suggestion,
                        priority: rec.priority || 'medium'
                    }
                });
            })
        );
    }
}