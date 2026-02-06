import { Elysia, t } from 'elysia';
import { analyzeSpace } from '../lib/ai.js';
import { nanoid } from 'nanoid';

/**
 * 分析任务存储
 * @description 内存存储（生产环境建议使用 Redis 或数据库）
 */
interface AnalysisJob {
    status: 'pending' | 'processing' | 'completed' | 'failed';
    result?: any;
    error?: string;
    createdAt: Date;
    completedAt?: Date;
    request: {
        room: { name: string };
        budget: { name: string; min: number; max: number };
        photos: Array<{ url: string; type: string }>;
    };
}

const analysisJobs = new Map<string, AnalysisJob>();

/**
 * 清理过期任务（1小时后自动清理）
 */
setInterval(() => {
    const now = Date.now();
    const expiredJobs: string[] = [];

    for (const [taskId, job] of analysisJobs.entries()) {
        const age = now - job.createdAt.getTime();
        if (age > 3600000) { // 1 小时
            analysisJobs.delete(taskId);
            expiredJobs.push(taskId);
        }
    }

    if (expiredJobs.length > 0) {
        console.log(`[任务清理] 清理了 ${expiredJobs.length} 个过期任务`);
    }
}, 300000); // 每 5 分钟清理一次

/**
 * AI 分析路由
 * 
 * @description 提供同步和异步两种分析模式
 */
export const analysisRoutes = new Elysia({ prefix: '/api/analysis' })

    /**
     * 同步分析接口（适合 1-2 张图片，快速返回）
     * 
     * @route POST /api/analysis/space
     * @description 基于上传的图片分析空间风险并给出改造建议
     */
    .post('/space', async ({ body, set }) => {
        const startTime = Date.now();

        try {
            const { room, budget, photos } = body;

            console.log('═══════════════════════════════════════════════════');
            console.log('[同步分析] 收到新请求');
            console.log('[同步分析] 时间:', new Date().toISOString());
            console.log('[同步分析] 空间类型:', room.name);
            console.log('[同步分析] 预算范围:', budget.name);
            console.log('[同步分析] 图片数量:', photos.length);
            console.log('[同步分析] 图片列表:');
            photos.forEach((photo, idx) => {
                console.log(`  ${idx + 1}. [${photo.type}] ${photo.url}`);
            });
            console.log('═══════════════════════════════════════════════════');

            // 限制图片数量（同步模式建议不超过 3 张）
            if (photos.length > 3) {
                set.status = 400;
                return {
                    success: false,
                    error: '同步分析模式最多支持 3 张图片',
                    message: `当前 ${photos.length} 张，建议使用异步分析接口 /api/analysis/space/async`
                };
            }

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

                if (!photo.url.startsWith('http://') && !photo.url.startsWith('https://')) {
                    set.status = 400;
                    return {
                        success: false,
                        error: `Photo ${i}: URL must start with http:// or https://`
                    };
                }
            }

            // 调用 AI 分析
            console.log('[同步分析] 开始调用 AI 服务...');
            const analysisResult = await analyzeSpace({
                room,
                budget,
                photos
            });

            const duration = ((Date.now() - startTime) / 1000).toFixed(2);

            console.log('═══════════════════════════════════════════════════');
            console.log('[同步分析] ✅ 分析完成');
            console.log('[同步分析] 总耗时:', duration, '秒');
            console.log('[同步分析] 风险点数量:', analysisResult.recommendations.length);
            console.log('[同步分析] 时间:', new Date().toISOString());
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
            console.error('[同步分析] ❌ 分析失败');
            console.error('[同步分析] 耗时:', duration, '秒');
            console.error('[同步分析] 错误类型:', error?.constructor?.name);
            console.error('[同步分析] 错误消息:', error instanceof Error ? error.message : String(error));
            if (error instanceof Error && error.stack) {
                console.error('[同步分析] 错误堆栈:', error.stack);
            }
            console.error('═══════════════════════════════════════════════════');

            if (error instanceof Error) {
                if (error.message.includes('超时') || error.message.includes('timeout')) {
                    set.status = 504;
                    return {
                        success: false,
                        error: 'AI 分析超时，建议使用异步分析接口',
                        message: error.message
                    };
                }

                if (error.message.includes('DashScope')) {
                    set.status = 502;
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
                    url: t.String({ minLength: 1 }),
                    type: t.String({ minLength: 1 })
                }),
                { minItems: 1, maxItems: 3 } // 同步模式限制 3 张
            )
        })
    })

    /**
     * 异步分析接口（推荐，适合多图片场景）
     * 
     * @route POST /api/analysis/space/async
     * @description 提交分析任务，立即返回任务 ID，客户端轮询获取结果
     * 
     * @example
     * // 小程序调用示例:
     * // 1. 提交任务
     * const submitRes = await wx.request({
     *   url: 'https://anset.top/api/analysis/space/async',
     *   method: 'POST',
     *   data: { room, budget, photos }
     * });
     * const taskId = submitRes.data.data.taskId;
     * 
     * // 2. 轮询获取结果（每 3 秒查询一次）
     * const pollInterval = setInterval(async () => {
     *   const resultRes = await wx.request({
     *     url: `https://anset.top/api/analysis/result/${taskId}`,
     *     method: 'GET'
     *   });
     *   
     *   if (resultRes.data.data.status === 'completed') {
     *     clearInterval(pollInterval);
     *     // 处理结果
     *   } else if (resultRes.data.data.status === 'failed') {
     *     clearInterval(pollInterval);
     *     // 处理错误
     *   }
     * }, 3000);
     */
    .post('/space/async', async ({ body, set }) => {
        try {
            const { room, budget, photos } = body;

            console.log('═══════════════════════════════════════════════════');
            console.log('[异步分析] 收到分析请求');
            console.log('[异步分析] 时间:', new Date().toISOString());
            console.log('[异步分析] 空间类型:', room.name);
            console.log('[异步分析] 预算范围:', budget.name);
            console.log('[异步分析] 图片数量:', photos.length);
            console.log('═══════════════════════════════════════════════════');

            // 验证必填字段
            if (!room?.name || !budget?.name || !photos || photos.length === 0) {
                set.status = 400;
                return {
                    success: false,
                    error: 'room, budget, and photos are required'
                };
            }

            // 验证图片数量
            if (photos.length > 10) {
                set.status = 400;
                return {
                    success: false,
                    error: '最多支持 10 张图片'
                };
            }


            // 生成任务 ID
            const taskId = nanoid(12);

            // 创建任务记录
            const job: AnalysisJob = {
                status: 'pending',
                createdAt: new Date(),
                request: { room, budget, photos }
            };
            analysisJobs.set(taskId, job);

            console.log(`[异步分析] 创建任务: ${taskId}`);

            // 立即返回任务 ID (HTTP 202 Accepted)
            set.status = 202;

            // 预估处理时间
            const estimatedTime = photos.length * 30; // 每张图约 30 秒

            // 异步执行分析任务（不阻塞响应）
            (async () => {
                const jobRecord = analysisJobs.get(taskId);
                if (!jobRecord) return;

                try {
                    // 更新状态为处理中
                    jobRecord.status = 'processing';
                    analysisJobs.set(taskId, jobRecord);

                    console.log(`[异步分析] 开始处理任务: ${taskId}`);
                    const analyzeStartTime = Date.now();

                    // 调用 AI 分析
                    const result = await analyzeSpace({
                        room: jobRecord.request.room,
                        budget: jobRecord.request.budget,
                        photos: jobRecord.request.photos
                    });

                    const analyzeDuration = ((Date.now() - analyzeStartTime) / 1000).toFixed(2);

                    // 更新为完成状态
                    jobRecord.status = 'completed';
                    jobRecord.result = result.recommendations;
                    jobRecord.completedAt = new Date();
                    analysisJobs.set(taskId, jobRecord);

                    console.log('═══════════════════════════════════════════════════');
                    console.log(`[异步分析] ✅ 任务完成: ${taskId}`);
                    console.log(`[异步分析] 分析耗时: ${analyzeDuration} 秒`);
                    console.log(`[异步分析] 风险点数量: ${result.recommendations.length}`);
                    console.log('[异步分析] 时间:', new Date().toISOString());
                    console.log('═══════════════════════════════════════════════════');

                } catch (error) {
                    // 更新为失败状态
                    jobRecord.status = 'failed';
                    jobRecord.error = error instanceof Error ? error.message : 'Unknown error';
                    jobRecord.completedAt = new Date();
                    analysisJobs.set(taskId, jobRecord);

                    console.error('═══════════════════════════════════════════════════');
                    console.error(`[异步分析] ❌ 任务失败: ${taskId}`);
                    console.error('[异步分析] 错误:', error);
                    console.error('[异步分析] 时间:', new Date().toISOString());
                    console.error('═══════════════════════════════════════════════════');
                }
            })();

            return {
                success: true,
                data: {
                    taskId,
                    status: 'pending',
                    estimatedTime,
                    message: `分析任务已创建，预计 ${estimatedTime} 秒完成。请使用 GET /api/analysis/result/${taskId} 查询结果`
                }
            };

        } catch (error) {
            console.error('[异步分析] 创建任务失败:', error);

            set.status = 500;
            return {
                success: false,
                error: '创建分析任务失败',
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
                    url: t.String({ minLength: 1 }),
                    type: t.String({ minLength: 1 })
                }),
                { minItems: 1, maxItems: 10 } // 异步模式支持最多 10 张
            )
        })
    })

    /**
     * 查询分析结果
     * 
     * @route GET /api/analysis/result/:taskId
     * @description 根据任务 ID 查询分析结果
     * 
     * @returns 
     * - HTTP 202: 任务仍在处理中
     * - HTTP 200: 任务已完成，返回结果
     * - HTTP 404: 任务不存在
     * - HTTP 500: 任务失败
     */
    .get('/result/:taskId', async ({ params, set }) => {
        try {
            const { taskId } = params;

            console.log(`[查询结果] 任务 ID: ${taskId}`);

            const job = analysisJobs.get(taskId);

            if (!job) {
                set.status = 404;
                return {
                    success: false,
                    error: '任务不存在或已过期',
                    message: `Task ID: ${taskId} not found`
                };
            }

            // 计算已用时间
            const elapsed = Date.now() - job.createdAt.getTime();
            const elapsedSeconds = Math.floor(elapsed / 1000);

            // 任务仍在处理中
            if (job.status === 'pending' || job.status === 'processing') {
                set.status = 202; // Still processing

                return {
                    success: true,
                    data: {
                        taskId,
                        status: job.status,
                        elapsedTime: elapsedSeconds,
                        message: job.status === 'pending' ? '任务排队中...' : '分析进行中...'
                    }
                };
            }

            // 任务已完成
            if (job.status === 'completed') {
                const duration = job.completedAt
                    ? (job.completedAt.getTime() - job.createdAt.getTime()) / 1000
                    : 0;

                console.log(`[查询结果] ✅ 任务已完成: ${taskId}, 耗时: ${duration}s`);

                return {
                    success: true,
                    data: {
                        taskId,
                        status: 'completed',
                        result: job.result,
                        meta: {
                            duration,
                            imageCount: job.request.photos.length,
                            riskCount: job.result?.length || 0
                        }
                    }
                };
            }

            // 任务失败
            if (job.status === 'failed') {
                console.log(`[查询结果] ❌ 任务失败: ${taskId}`);

                set.status = 500;
                return {
                    success: false,
                    error: '分析失败',
                    message: job.error || 'Unknown error',
                    data: {
                        taskId,
                        status: 'failed'
                    }
                };
            }

        } catch (error) {
            console.error('[查询结果] 查询失败:', error);

            set.status = 500;
            return {
                success: false,
                error: '查询结果失败',
                message: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    })

    /**
     * 查询任务状态（仅返回状态，不返回完整结果）
     * 
     * @route GET /api/analysis/status/:taskId
     */
    .get('/status/:taskId', async ({ params, set }) => {
        const { taskId } = params;
        const job = analysisJobs.get(taskId);

        if (!job) {
            set.status = 404;
            return {
                success: false,
                error: '任务不存在'
            };
        }

        const elapsed = Math.floor((Date.now() - job.createdAt.getTime()) / 1000);

        return {
            success: true,
            data: {
                taskId,
                status: job.status,
                elapsedTime: elapsed,
                createdAt: job.createdAt.toISOString(),
                completedAt: job.completedAt?.toISOString()
            }
        };
    })

    /**
     * 手动清理过期任务（管理接口）
     * 
     * @route DELETE /api/analysis/cleanup
     */
    .delete('/cleanup', async () => {
        const now = Date.now();
        const expired: string[] = [];

        for (const [taskId, job] of analysisJobs.entries()) {
            const age = now - job.createdAt.getTime();
            if (age > 3600000) { // 1 小时
                analysisJobs.delete(taskId);
                expired.push(taskId);
            }
        }

        console.log(`[任务清理] 清理了 ${expired.length} 个过期任务`);

        return {
            success: true,
            data: {
                cleaned: expired.length,
                remaining: analysisJobs.size,
                expiredTasks: expired
            }
        };
    })

    /**
     * 获取任务统计信息（管理接口）
     * 
     * @route GET /api/analysis/stats
     */
    .get('/stats', async () => {
        const stats = {
            total: analysisJobs.size,
            pending: 0,
            processing: 0,
            completed: 0,
            failed: 0
        };

        for (const job of analysisJobs.values()) {
            stats[job.status]++;
        }

        return {
            success: true,
            data: stats
        };
    });