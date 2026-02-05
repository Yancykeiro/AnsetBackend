import { Elysia, t } from 'elysia';
import { analyzeSpace } from '../lib/ai';

/**
 * AI 分析路由
 * 
 * @description 处理空间分析请求，调用百炼智能体返回改造建议
 */
export const analysisRoutes = new Elysia({ prefix: '/api/analysis' })

    /**
     * 分析空间并返回改造建议
     * 
     * @route POST /api/analysis/space
     * @description 基于上传的图片分析空间风险并给出改造建议
     * 
     * @example
     * // 小程序调用:
     * const res = await wx.request({
     *   url: 'https://anset.top/api/analysis/space',
     *   method: 'POST',
     *   data: {
     *     room: { name: "卫生间" },
     *     budget: { name: "小于5000元", min: 0, max: 5000 },
     *     photos: [
     *       { url: "https://anset.top/static/testcamera/tongdao.png", type: "通道" },
     *       { url: "https://anset.top/static/testcamera/洗手池.jpg", type: "洗手池" }
     *     ]
     *   }
     * });
     */
    .post('/space', async ({ body, set }) => {
        try {
            const { room, budget, photos } = body;


            // 验证必填字段
            if (!room?.name) {
                set.status = 400;
                return {
                    success: false,
                    error: 'room.name is required'
                };
            }

            if (!budget?.name) {
                set.status = 400;
                return {
                    success: false,
                    error: 'budget.name is required'
                };
            }

            if (!photos || photos.length === 0) {
                set.status = 400;
                return {
                    success: false,
                    error: 'At least one photo is required'
                };
            }


            // 调用 AI 分析
            const analysisResult = await analyzeSpace({
                room,
                budget,
                photos
            });

            console.log('[分析请求] 分析完成，风险点数量:', analysisResult.recommendations.length);

            return {
                success: true,
                data: analysisResult.recommendations
            };

        } catch (error) {
            console.error('[分析请求] 分析失败:', error);

            // 区分不同类型的错误
            if (error instanceof Error) {
                if (error.message.includes('DashScope')) {
                    set.status = 502; // Bad Gateway - 上游服务错误
                    return {
                        success: false,
                        error: 'AI 服务暂时不可用，请稍后重试',
                        message: error.message
                    };
                }

                if (error.message.includes('解析') || error.message.includes('格式')) {
                    set.status = 500;
                    return {
                        success: false,
                        error: 'AI 返回数据解析失败',
                        message: error.message
                    };
                }
            }

            set.status = 500;
            return {
                success: false,
                error: '分析失败，请重试',
                message: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }, {
        body: t.Object({
            room: t.Object({
                name: t.String({ minLength: 1 })
            }),
            budget: t.Object({
                name: t.String({ minLength: 1 }),
                min: t.Number({ minimum: 0 }),
                max: t.Number({ minimum: 0 })
            }),
            photos: t.Array(
                t.Object({
                    url: t.String({ format: 'uri' }),
                    type: t.String({ minLength: 1 })
                }),
                { minItems: 1, maxItems: 10 }
            )
        })
    });