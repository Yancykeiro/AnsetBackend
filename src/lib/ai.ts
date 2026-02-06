import axios from 'axios';

/**
 * 百炼智能体配置
 */
const DASHSCOPE_CONFIG = {
    apiKey: 'sk-8d870d21086549d584c50b1f1980d929',
    appId: '80cdc3bc489749398bf5f3055dd2ff2d',
    // apiKey: process.env.DASHSCOPE_API_KEY || 'sk-8d870d21086549d584c50b1f1980d929',
    // appId: process.env.DASHSCOPE_APP_ID || '80cdc3bc489749398bf5f3055dd2ff2d',
    baseUrl: 'https://dashscope.aliyuncs.com/api/v1/apps',
    timeout: 1200000 // 2分钟超时
};

/**
 * AI 分析请求参数
 */
export interface AnalysisRequest {
    room: {
        name: string; // 空间类型，如"卫生间"
    };
    budget: {
        name: string; // 预算名称，如"小于5000元"
        min: number;
        max: number;
    };
    photos: Array<{
        url: string; // 图片 URL
        type: string; // 图片类型，如"通道"、"洗手池"
    }>;
}


/**
 * AI 分析响应
 */
export interface AnalysisResponse {
    recommendations: Recommendation[];
}

/**
 * 构建 AI 提示词
 */
function buildPrompt(config: {
    spaceType: string;
    imageTypes: string[];
    imageCount: number;
    budgetRange: string;
}): string {
    const { spaceType, imageTypes, imageCount, budgetRange } = config;

    // 构建图片说明
    const imageDescriptions = imageTypes
        .map((type, idx) => `图片${idx + 1}(${type})`)
        .join('、');

    return `
## 角色
你是一名专业的居家养老空间规划师，根据知识库中的知识和老年人居住习惯，判断图片中的${spaceType}风险点，并提出改造建议。

## 任务说明
你的任务是判断图片中的风险，给出风险标题、风险等级、风险原因和改造方法。

## 基本信息
- 空间类型: ${spaceType}
- 预算范围: ${budgetRange}
- 图片数量: ${imageCount}张
- 图片说明: ${imageDescriptions}

## 分析要求

### 针对每张图片
请为每张图片单独识别风险点：
1. 仔细观察图片中的安全隐患（地面湿滑、空间狭窄、照明不足等）
2. 识别功能性问题（扶手缺失、高度不合理、收纳不便等）
3. 考虑老年人的特殊需求（行动不便、视力下降、反应迟缓等）

### 风险等级评估标准
根据以下标准判断每个风险点的等级：

**高风险**：
- 可能直接导致跌倒、碰撞等人身伤害
- 影响紧急情况下的逃生或求助
- 可能造成严重的财产损失
- 例如：地面湿滑、无扶手、照明严重不足、尖锐物品外露

**中风险**：
- 影响日常生活便利性和舒适度
- 长期使用可能积累成安全隐患
- 对特定情况下的老年人有较大影响
- 例如：收纳不便、高度不合理、空间拥挤、通风不良

**低风险**：
- 轻微影响使用体验
- 主要涉及美观和舒适度
- 改善后能提升生活品质但非必要
- 例如：颜色搭配、装饰布置、轻微的收纳问题

## 输出格式

### 严格按照以下 JSON 格式输出
\`\`\`json
{
  "recommendations": [
    {
      "image_index": 0,
      "image_type": "通道",
      "risk_level": "高",
      "risk_title": "地面过于光滑",
      "risk_analysis": "瓷砖地面遇水易滑，老年人容易摔倒，可能造成骨折等严重后果。",
      "renovation_suggestion": "建议更换为**防滑瓷砖**或铺设**防滑地垫**，关键区域安装**L型扶手**。"
    },
    {
      "image_index": 0,
      "image_type": "通道",
      "risk_level": "中",
      "risk_title": "照明不足",
      "risk_analysis": "走廊光线昏暗，老年人视力下降容易看不清障碍物。",
      "renovation_suggestion": "增加**感应式夜灯**，在墙面安装**LED灯带**提供充足照明。"
    }
  ]
}
\`\`\`

### 输出内容要求
1. **image_index**: 图片索引（0开始）
2. **image_type**: 图片类型（${imageTypes.join('、')}）
3. **risk_level**: 风险等级（必须是「高」、「中」、「低」之一）
4. **risk_title**: 风险标题（10字以内），例如「地面过于光滑」、「照明不足」
5. **risk_analysis**: 风险原因（30字以内），专业简洁地描述该风险可能引发的问题
6. **renovation_suggestion**: 改造建议（50字以内），若包含需购买的物品请用**加粗**标注

### 注意事项
- 每张图片至少识别1-3个风险点
- 优先识别高风险问题，确保老年人居住安全
- 如果某张图片无明显风险，也需说明现状良好
- 建议必须具体可操作，包含材料、尺寸、安装位置等细节
- 建议的产品必须符合老年人使用习惯（如易操作、防滑、醒目等）
- 优先推荐性价比高、安装简便的改造方案

请基于知识库中的专业知识进行分析，确保建议符合居家养老空间改造标准。
`.trim();
}
/**
 * 单个改造建议
 */
export interface Recommendation {
    image_index: number;
    image_type: string;
    risk_level: '高' | '中' | '低'; // ✅ 新增风险等级
    risk_title: string;
    risk_analysis: string;
    renovation_suggestion: string;
}
/**
 * 调用百炼智能体进行空间分析
 * 
 * @param request - 分析请求参数
 * @returns AI 分析结果
 * @throws Error 当 API 调用失败或解析失败时
 */
export async function analyzeSpace(
    request: AnalysisRequest
): Promise<AnalysisResponse> {
    try {


        // 验证配置
        if (!DASHSCOPE_CONFIG.apiKey || !DASHSCOPE_CONFIG.appId) {
            throw new Error('DashScope API 配置缺失，请检查环境变量');
        }

        // 提取图片 URL 和类型
        const imageUrls = request.photos.map(photo => photo.url);
        const imageTypes = request.photos.map(photo => photo.type);

        // 构建提示词
        const prompt = buildPrompt({
            spaceType: request.room.name,
            imageTypes,
            imageCount: request.photos.length,
            budgetRange: request.budget.name
        });

        // 构建请求数据
        const requestData = {
            input: {
                prompt,
                images: imageUrls
            },
            parameters: {},
            debug: {}
        };

        console.log('[AI分析] 调用 DashScope API...');

        const startTime = Date.now();

        // 调用 API
        const url = `https://dashscope.aliyuncs.com/api/v1/apps/${DASHSCOPE_CONFIG.appId}/completion`;

        const response = await axios.post(
            url,
            requestData,
            {
                headers: {
                    'Authorization': `Bearer ${DASHSCOPE_CONFIG.apiKey}`,
                    'Content-Type': 'application/json'
                },
                timeout: DASHSCOPE_CONFIG.timeout
            }
        );

        const duration = ((Date.now() - startTime) / 1000).toFixed(2);

        if (response.status !== 200) {
            throw new Error(`DashScope API 返回错误: ${response.status}`);
        }

        console.log('[AI分析] API 调用成功');
        console.log('[AI分析] 耗时:', duration, 's');
        console.log('[AI分析] Request ID:', response.headers['x-request-id'] || 'N/A');

        // 提取响应文本
        const aiText = response.data.output?.text;
        if (!aiText) {
            throw new Error('DashScope API 返回数据为空');
        }

        console.log('[AI分析] AI 原始响应:', aiText.substring(0, 200) + '...');

        // 解析 JSON
        // 匹配 ```json ... ``` 或直接匹配 JSON 对象
        const jsonMatch = aiText.match(/```json\s*([\s\S]*?)\s*```/) ||
            aiText.match(/\{[\s\S]*"recommendations"[\s\S]*\}/);

        if (!jsonMatch) {
            console.error('[AI分析] 无法从响应中提取 JSON');
            console.error('[AI分析] 完整响应:', aiText);
            throw new Error('AI 返回格式不正确，无法解析 JSON');
        }

        const jsonStr = jsonMatch[1] || jsonMatch[0];
        const parsed: AnalysisResponse = JSON.parse(jsonStr);

        // 验证响应格式
        if (!parsed.recommendations || !Array.isArray(parsed.recommendations)) {
            throw new Error('AI 返回数据格式错误：缺少 recommendations 数组');
        }

        console.log('[AI分析] 解析成功，风险点数量:', parsed.recommendations.length);

        // 验证每个建议的格式
        parsed.recommendations.forEach((rec, idx) => {
            if (!rec.image_type || !rec.risk_title || !rec.risk_analysis || !rec.renovation_suggestion) {
                console.warn(`[AI分析] 建议 ${idx} 格式不完整:`, rec);
            }
        });

        return parsed;

    } catch (error) {
        console.error('[AI分析] 分析失败:', error);

        if (axios.isAxiosError(error)) {
            if (error.response) {
                console.error('[AI分析] API 错误响应:', error.response.data);
                throw new Error(`DashScope API 错误: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
            } else if (error.code === 'ECONNABORTED') {
                throw new Error('DashScope API 请求超时，请稍后重试');
            }
        }

        throw error;
    }
}