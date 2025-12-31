/**
 * 通义千问 AI 服务集成
 * 使用阿里云 DashScope API
 */

interface TongyiImageAnalysisRequest {
    images: string[]; // 图片 URL 数组
    roomType: string;
    budgetRange: string;
    surveyAnswers?: any;
}

interface TongyiAnalysisResult {
    summary: string;
    problems: string;
    suggestions: string;
    materials?: string;
    estimatedCost?: string;
    rawResponse: any;
}

/**
 * 调用通义千问分析图片
 */
export async function analyzeImagesWithTongyi(
    request: TongyiImageAnalysisRequest
): Promise<TongyiAnalysisResult> {
    const apiKey = process.env.TONGYI_API_KEY;

    if (!apiKey) {
        throw new Error('TONGYI_API_KEY is not configured');
    }

    // 构建提示词
    const prompt = buildPrompt(request);

    try {
        // 调用通义千问 API
        // 注意：这里使用的是通义千问的多模态API（qwen-vl-plus）
        const response = await fetch('https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'qwen-vl-plus', // 或 qwen-vl-max
                input: {
                    messages: [
                        {
                            role: 'system',
                            content: '你是一个专业的家居设计顾问，擅长分析房间照片并提供改造建议。'
                        },
                        {
                            role: 'user',
                            content: [
                                { text: prompt },
                                ...request.images.map(url => ({ image: url }))
                            ]
                        }
                    ]
                },
                parameters: {
                    max_tokens: 2000,
                }
            })
        });

        if (!response.ok) {
            throw new Error(`Tongyi API error: ${response.statusText}`);
        }

        const data = await response.json();

        // 解析 AI 响应
        return parseAIResponse(data);

    } catch (error) {
        console.error('Tongyi API call failed:', error);
        throw error;
    }
}

/**
 * 构建分析提示词
 */
function buildPrompt(request: TongyiImageAnalysisRequest): string {
    return `
请分析这个${request.roomType}的照片，用户的预算范围是${request.budgetRange}。

请按照以下格式提供分析报告：

1. **整体评估**
   - 简要描述房间当前状况

2. **存在问题**
   - 列出发现的主要问题（如老旧、布局不合理、功能性不足等）

3. **改造建议**
   - 根据预算范围提供具体的改造方案
   - 包括布局优化、功能提升、美观度改善等方面

4. **建议材料**
   - 推荐适合的装修材料和品牌

5. **预估费用**
   - 给出大致的改造费用范围

请确保建议实用、具体，并符合用户的预算范围。
`.trim();
}

/**
 * 解析 AI 响应结果
 */
function parseAIResponse(data: any): TongyiAnalysisResult {
    const content = data.output?.choices?.[0]?.message?.content || '';

    // 这里简化处理，实际应该根据响应格式进行结构化解析
    return {
        summary: extractSection(content, '整体评估'),
        problems: extractSection(content, '存在问题'),
        suggestions: extractSection(content, '改造建议'),
        materials: extractSection(content, '建议材料'),
        estimatedCost: extractSection(content, '预估费用'),
        rawResponse: data,
    };
}

/**
 * 从文本中提取特定章节
 */
function extractSection(content: string, sectionName: string): string {
    const regex = new RegExp(`\\*\\*${sectionName}\\*\\*([\\s\\S]*?)(?=\\*\\*|$)`, 'i');
    const match = content.match(regex);
    return match ? match[1].trim() : '';
}
