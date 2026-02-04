const axios = require('axios');

/**
 * 测试百炼智能体接口 - 居家养老空间规划
 * 
 * @description 
 * 测试场景：
 * 1. 基础文本问答
 * 2. 多图片分析（卫生间场景）
 * 3. 带类型的图片分析
 */
async function callDashScope() {
    const apiKey = 'sk-8d870d21086549d584c50b1f1980d929';
    const appId = '80cdc3bc489749398bf5f3055dd2ff2d';

    const url = `https://dashscope.aliyuncs.com/api/v1/apps/${appId}/completion`;

    console.log('╔' + '═'.repeat(78) + '╗');
    console.log('║' + ' '.repeat(20) + '百炼智能体测试 - 居家养老空间规划' + ' '.repeat(20) + '║');
    console.log('╚' + '═'.repeat(78) + '╝\n');

    // // 测试 1: 基础问答
    // console.log('========================================');
    // console.log('测试 1: 基础问答');
    // console.log('========================================\n');
    // await testBasicChat(url, apiKey);

    // // 测试 2: 单张图片分析
    // console.log('\n========================================');
    // console.log('测试 2: 单张图片分析');
    // console.log('========================================\n');
    // await testSingleImageAnalysis(url, apiKey);

    // 测试 3: 多张带类型的图片分析（模拟卫生间场景）
    console.log('\n========================================');
    console.log('测试 3: 卫生间多图分析（带类型）');
    console.log('========================================\n');
    await testBathroomAnalysis(url, apiKey);
}

/**
 * 测试基础文本问答
 */
async function testBasicChat(url, apiKey) {
    const data = {
        input: {
            prompt: "你是谁？你的主要功能是什么？"
        },
        parameters: {},
        debug: {}
    };

    try {
        const response = await axios.post(url, data, {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            timeout: 30000
        });

        if (response.status === 200) {
            console.log('✅ 请求成功');
            console.log(`Request ID: ${response.headers['x-request-id'] || 'N/A'}`);
            console.log('\n【回答】:');
            console.log(response.data.output.text);
        } else {
            console.log('❌ 请求失败');
            console.log(`Status: ${response.status}`);
            console.log(`Message: ${response.data.message}`);
        }
    } catch (error) {
        console.error('❌ 调用失败:', error.message);
        if (error.response) {
            console.error(`状态码: ${error.response.status}`);
            console.error(`错误详情: ${JSON.stringify(error.response.data, null, 2)}`);
        }
    }
}

/**
 * 测试单张图片分析
 */
async function testSingleImageAnalysis(url, apiKey) {
    const testImages = [
        'https://dashscope.oss-cn-beijing.aliyuncs.com/images/dog_and_girl.jpeg'
    ];

    const prompt = buildPrompt({
        spaceType: '客厅',
        imageTypes: ['整体空间'],
        imageCount: 1,
        budgetRange: '5000-10000元',
        surveyAnswers: {
            '居住人数': '1人',
            '是否有行动不便': '是',
            '特殊需求': '需要增加扶手'
        }
    });

    const data = {
        input: {
            prompt,
            images: testImages
        },
        parameters: {},
        debug: {}
    };

    await executeAnalysis(url, apiKey, data, testImages);
}

/**
 * 测试卫生间多图分析（模拟实际场景）
 */
async function testBathroomAnalysis(url, apiKey) {
    // 模拟卫生间的 4 张图片
    const testImages = [
        'https://anset.top/static/testcamera/tongdao.png', // 模拟通道
        'https://anset.top/static/testcamera/洗手池.jpg', // 模拟洗手池
        'https://anset.top/static/testcamera/坐便器.jpg', // 模拟坐便器
        'https://anset.top/static/testcamera/淋浴.jpg'  // 模拟淋浴
    ];

    const imageTypes = ['通道', '洗手池', '坐便器', '淋浴'];

    const prompt = buildPrompt({
        spaceType: '卫生间',
        imageTypes,
        imageCount: testImages.length,
        budgetRange: '8000-15000元',
        surveyAnswers: {
            '居住人数': '2人',
            '年龄段': '65岁以上',
            '是否有行动不便': '轻微不便',
            '特殊需求': '需要防滑处理和扶手安装'
        }
    });

    const data = {
        input: {
            prompt,
            images: testImages
        },
        parameters: {},
        debug: {}
    };

    await executeAnalysis(url, apiKey, data, testImages);
}

/**
 * 构建符合智能体要求的提示词
 * 
 * @param {Object} config - 配置参数
 * @param {string} config.spaceType - 空间类型（如：卫生间、客厅、卧室）
 * @param {string[]} config.imageTypes - 图片类型数组（如：['通道', '洗手池', '坐便器', '淋浴']）
 * @param {number} config.imageCount - 图片数量
 * @param {string} config.budgetRange - 预算范围
 * @param {Object} config.surveyAnswers - 问卷调查结果（可选）
 * @returns {string} 完整的提示词
 */
function buildPrompt(config) {
    const {
        spaceType,
        imageTypes,
        imageCount,
        budgetRange,
        surveyAnswers
    } = config;

    // 构建图片说明
    const imageDescriptions = imageTypes
        .map((type, idx) => `图片${idx + 1}(${type})`)
        .join('、');

    // 构建用户需求部分
    let surveyInfo = '';
    if (surveyAnswers && Object.keys(surveyAnswers).length > 0) {
        surveyInfo = '\n\n## 用户需求\n';
        Object.entries(surveyAnswers).forEach(([key, value]) => {
            surveyInfo += `- ${key}: ${value}\n`;
        });
    }

    return `
## 角色
你是一名专业的居家养老空间规划师，根据知识库中的知识和老年人居住习惯，判断图片中的${spaceType}风险点，并提出改造建议。

## 任务说明
你的任务是判断图片中的风险并给出风险标题、风险原因和改造方法。

## 基本信息
- 空间类型: ${spaceType}
- 预算范围: ${budgetRange}
- 图片数量: ${imageCount}张
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
    },
    {
      "image_index": 1,
      "image_type": "洗手池",
      "risk_title": "缺少扶手支撑",
      "risk_analysis": "洗漱时缺乏支撑点，老年人起身困难，长时间弯腰容易头晕。",
      "renovation_suggestion": "在洗手池两侧安装**不锈钢扶手**，台面高度调整至80-85cm，配备**防滑脚垫**。"
    }
  ]
}
\`\`\`

### 输出内容要求
1. **image_index**: 图片索引（0开始）
2. **image_type**: 图片类型（${imageTypes.join('、')}）
3. **risk_title**: 风险标题（10字以内），例如「地面过于光滑」、「照明不足」
4. **risk_analysis**: 风险原因（30字以内），专业简洁地描述该风险可能引发的问题
5. **renovation_suggestion**: 改造建议（50字以内），若包含需购买的物品请用**加粗**标注

### 注意事项
- 每张图片至少识别1-3个风险点
- 如果某张图片无明显风险，也需说明现状良好
- 建议必须具体可操作，包含材料、尺寸、安装位置等细节
- 建议的产品必须符合老年人使用习惯（如易操作、防滑、醒目等）
- 优先推荐性价比高、安装简便的改造方案

请基于知识库中的专业知识进行分析，确保建议符合居家养老空间改造标准。
`.trim();
}

/**
 * 执行分析并展示结果
 */
async function executeAnalysis(url, apiKey, data, testImages) {
    try {
        console.log(`📸 图片数量: ${testImages.length}`);
        console.log(`📸 图片 URL: ${testImages.join(', ')}`);
        console.log('\n⏳ 正在分析...\n');

        const startTime = Date.now();

        const response = await axios.post(url, data, {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            timeout: 120000
        });

        const endTime = Date.now();
        const duration = ((endTime - startTime) / 1000).toFixed(2);

        if (response.status === 200) {
            console.log(`✅ 分析成功 (耗时: ${duration}s)`);
            console.log(`Request ID: ${response.headers['x-request-id'] || 'N/A'}`);
            console.log('\n【AI 原始回答】:');
            console.log('─'.repeat(80));
            console.log(response.data.output.text);
            console.log('─'.repeat(80));

            // 尝试解析 JSON
            try {
                const jsonMatch = response.data.output.text.match(/```json\s*([\s\S]*?)\s*```/) ||
                    response.data.output.text.match(/\{[\s\S]*"recommendations"[\s\S]*\}/);

                if (jsonMatch) {
                    const parsed = JSON.parse(jsonMatch[1] || jsonMatch[0]);

                    console.log('\n【结构化结果】:');
                    console.log('═'.repeat(80));
                    console.log(JSON.stringify(parsed, null, 2));
                    console.log('═'.repeat(80));

                    // 统计分析
                    if (parsed.recommendations) {
                        console.log(`\n📊 风险点统计: 共 ${parsed.recommendations.length} 个`);

                        parsed.recommendations.forEach((rec, idx) => {
                            console.log(`\n${idx + 1}. ${rec.image_type || '未知区域'} - ${rec.risk_title}`);
                            console.log(`   原因: ${rec.risk_analysis}`);
                            console.log(`   建议: ${rec.renovation_suggestion}`);
                        });
                    }

                    return parsed;
                } else {
                    console.log('\n⚠️  AI 返回的不是预期的 JSON 格式');
                }
            } catch (e) {
                console.error('\n❌ JSON 解析失败:', e.message);
                console.log('请检查 AI 返回的格式是否正确');
            }
        } else {
            console.log('❌ 请求失败');
            console.log(`Status: ${response.status}`);
            console.log(`Message: ${response.data.message}`);
        }
    } catch (error) {
        console.error('❌ 调用失败:', error.message);
        if (error.response) {
            console.error(`状态码: ${error.response.status}`);
            console.error(`错误详情: ${JSON.stringify(error.response.data, null, 2)}`);
        }
    }
}

// 运行测试
callDashScope().catch(console.error);