import { Elysia, t } from 'elysia';
import { analyzeSpace } from '../lib/ai.js';

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
        const startTime = Date.now();

        try {
            const { room, budget, photos } = body;

            console.log('═══════════════════════════════════════════════════');
            console.log('[分析请求] 收到新请求');
            console.log('[分析请求] 时间:', new Date().toISOString());
            console.log('[分析请求] 空间类型:', room.name);
            console.log('[分析请求] 预算范围:', budget.name);
            console.log('[分析请求] 图片数量:', photos.length);
            console.log('[分析请求] 图片列表:');
            photos.forEach((photo, idx) => {
                console.log(`  ${idx + 1}. [${photo.type}] ${photo.url}`);
            });
            console.log('═══════════════════════════════════════════════════');

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

            // 手动验证 URL（支持中文字符）
            for (let i = 0; i < photos.length; i++) {
                const photo = photos[i];

                if (!photo.url || !photo.type) {
                    set.status = 400;
                    return {
                        success: false,
                        error: `Photo ${i}: url and type are required`
                    };
                }

                // 简单验证 URL 格式（支持中文）
                if (!photo.url.startsWith('http://') && !photo.url.startsWith('https://')) {
                    set.status = 400;
                    return {
                        success: false,
                        error: `Photo ${i}: URL must start with http:// or https://`
                    };
                }
            }

            // 调用 AI 分析
            console.log('[分析请求] 开始调用 AI 服务...');
            const analysisResult = await analyzeSpace({
                room,
                budget,
                photos
            });

            const duration = ((Date.now() - startTime) / 1000).toFixed(2);

            console.log('═══════════════════════════════════════════════════');
            console.log('[分析请求] ✅ 分析完成');
            console.log('[分析请求] 总耗时:', duration, '秒');
            console.log('[分析请求] 风险点数量:', analysisResult.recommendations.length);
            console.log('[分析请求] 时间:', new Date().toISOString());
            console.log('═══════════════════════════════════════════════════');

            return {
                success: true,
                data: analysisResult.recommendations,
                meta: {
                    duration: parseFloat(duration),
                    imageCount: photos.length,
                    riskCount: analysisResult.recommendations.length
                }
            };

        } catch (error) {
            const duration = ((Date.now() - startTime) / 1000).toFixed(2);

            console.error('═══════════════════════════════════════════════════');
            console.error('[分析请求] ❌ 分析失败');
            console.error('[分析请求] 耗时:', duration, '秒');
            console.error('[分析请求] 错误类型:', error?.constructor?.name);
            console.error('[分析请求] 错误消息:', error instanceof Error ? error.message : String(error));
            if (error instanceof Error && error.stack) {
                console.error('[分析请求] 错误堆栈:', error.stack);
            }
            console.error('═══════════════════════════════════════════════════');

            // 区分不同类型的错误
            if (error instanceof Error) {
                if (error.message.includes('超时') || error.message.includes('timeout')) {
                    set.status = 504; // Gateway Timeout
                    return {
                        success: false,
                        error: 'AI 分析超时，请稍后重试',
                        message: error.message
                    };
                }

                if (error.message.includes('DashScope')) {
                    set.status = 502; // Bad Gateway
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
                    // ⚠️ 关键修改：移除 format: 'uri' 以支持中文 URL
                    url: t.String({ minLength: 1 }),
                    type: t.String({ minLength: 1 })
                }),
                { minItems: 1, maxItems: 10 }
            )
        })
    });