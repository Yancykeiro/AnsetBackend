// import OpenAI from 'openai';

// /**
//  * 通义千问 AI 客户端
//  * 
//  * @description 使用阿里云 DashScope API（兼容 OpenAI SDK）
//  */
// const client = new OpenAI({
//     apiKey: process.env.DASHSCOPE_API_KEY,
//     baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
// });

// /**
//  * AI 分析参数接口
//  */
// interface AnalysisParams {
//     images: string[];
//     roomType: string;
//     budgetRange: string;
//     surveyAnswers?: Record<string, any>;
// }

// /**
//  * AI 分析结果接口
//  */
// interface AnalysisResult {
//     summary: string;
//     estimatedCost?: string;
//     priority?: string;
//     rawResponse: any;
// }

// /**
//  * 使用通义千问分析图片
//  * 
//  * @param params 分析参数
//  * @returns AI 分析结果
//  */
// export async function analyzeImagesWithTongyi(
//     params: AnalysisParams
// ): Promise<AnalysisResult> {
//     try {
//         const { images, roomType, budgetRange, surveyAnswers } = params;

//         // 构建 prompt
//         const userPrompt = `
// 你是一位专业的适老化改造顾问。请分析以下${roomType}的图片，并提供详细的改造建议。

// **房间类型**: ${roomType}
// **预算范围**: ${budgetRange}
// ${surveyAnswers ? `**用户需求**: ${JSON.stringify(surveyAnswers, null, 2)}` : ''}

// 请按照以下格式输出 JSON：
// {
//     "summary": "总体总结（200字以内）",
//     "estimatedCost": "预算估算（如：12000-15000元）",
//     "priority": "优先级（high/medium/low）"
// }
//         `.trim();

//         // 构建消息内容（多模态：文本 + 图片）
//         const content: any[] = [
//             { type: 'text', text: userPrompt },
//             ...images.map((url) => ({
//                 type: 'image_url',
//                 image_url: { url },
//             })),
//         ];

//         console.log(`[AI] 调用通义千问分析 ${images.length} 张图片...`);

//         // 调用通义千问 API
//         const completion = await client.chat.completions.create({
//             model: 'qwen-vl-max', // 多模态模型
//             messages: [
//                 {
//                     role: 'user',
//                     content,
//                 },
//             ],
//             temperature: 0.7,
//             max_tokens: 2000,
//         });

//         const responseText = completion.choices[0]?.message?.content || '{}';
//         console.log(`[AI] 通义千问响应:`, responseText.substring(0, 200));

//         // 解析 JSON 响应
//         let parsedResult: any;
//         try {
//             // 尝试提取 JSON（AI 可能返回 markdown 代码块）
//             const jsonMatch = responseText.match(/```json\n([\s\S]*?)\n```/);
//             const jsonText = jsonMatch ? jsonMatch[1] : responseText;
//             parsedResult = JSON.parse(jsonText);
//         } catch {
//             // 解析失败，使用默认值
//             parsedResult = {
//                 summary: responseText.substring(0, 200),
//                 estimatedCost: budgetRange,
//                 priority: 'medium',
//             };
//         }

//         return {
//             summary: parsedResult.summary || '分析结果生成中...',
//             estimatedCost: parsedResult.estimatedCost || budgetRange,
//             priority: parsedResult.priority || 'medium',
//             rawResponse: completion,
//         };

//     } catch (error) {
//         console.error('[AI] 通义千问分析失败:', error);
//         throw new Error(
//             `AI analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`
//         );
//     }
// }