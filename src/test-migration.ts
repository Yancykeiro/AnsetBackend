// import { PrismaClient } from '@prisma/client';

// const prisma = new PrismaClient({
//     log: ['query', 'error', 'warn'],
// });

// /**
//  * 测试数据库迁移后的功能
//  *
//  * @description 验证所有表结构已正确创建
//  */
// async function testMigration() {
//     try {
//         console.log('🔍 测试数据库迁移结果...\n');

//         // 连接测试
//         await prisma.$connect();
//         console.log('✅ 数据库连接成功\n');

//         // 测试 User 表
//         console.log('1️⃣ 测试 User 表...');
//         const user = await prisma.user.create({
//             data: {
//                 openId: `wx_${Date.now()}`,
//                 nickName: '迁移测试用户',
//                 avatarUrl: 'https://anset.top/avatar.jpg',
//             },
//         });
//         console.log(`   ✅ User 表正常 (ID: ${user.id})`);

//         // 测试 UploadSession 表
//         console.log('2️⃣ 测试 UploadSession 表...');
//         const session = await prisma.uploadSession.create({
//             data: {
//                 userId: user.id,
//                 roomType: '卫生间',
//                 budgetRange: '8000-15000元',
//             },
//         });
//         console.log(`   ✅ UploadSession 表正常 (ID: ${session.id})`);

//         // 测试 TempImage 表
//         console.log('3️⃣ 测试 TempImage 表...');
//         const tempImage = await prisma.tempImage.create({
//             data: {
//                 sessionId: session.id,
//                 url: 'https://anset.top/images/test.jpg',
//                 type: '通道',
//                 order: 1,
//                 filename: 'test.jpg',
//                 fileSize: 1024000,
//             },
//         });
//         console.log(`   ✅ TempImage 表正常 (ID: ${tempImage.id})`);

//         // 测试 Report 表
//         console.log('4️⃣ 测试 Report 表...');
//         const report = await prisma.report.create({
//             data: {
//                 userId: user.id,
//                 roomType: '卫生间',
//                 budgetRange: '8000-15000元',
//                 hasSurvey: true,
//                 surveyData: {
//                     age: 75,
//                     mobility: '需要辅助',
//                 },
//             },
//         });
//         console.log(`   ✅ Report 表正常 (ID: ${report.id})`);

//         // 测试 Image 表
//         console.log('5️⃣ 测试 Image 表...');
//         const image = await prisma.image.create({
//             data: {
//                 reportId: report.id,
//                 url: 'https://anset.top/images/report.jpg',
//                 type: '淋浴区',
//                 order: 1,
//                 filename: 'report.jpg',
//                 fileSize: 2048000,
//             },
//         });
//         console.log(`   ✅ Image 表正常 (ID: ${image.id})`);

//         // 测试 ImageAnalysis 表
//         console.log('6️⃣ 测试 ImageAnalysis 表...');
//         const imageAnalysis = await prisma.imageAnalysis.create({
//             data: {
//                 imageId: image.id,
//                 riskTitle: '地面湿滑风险',
//                 riskAnalysis: '卫生间地面瓷砖光滑，存在滑倒风险',
//                 renovation: '建议更换防滑地砖并安装扶手',
//                 priority: 'high',
//             },
//         });
//         console.log(`   ✅ ImageAnalysis 表正常 (ID: ${imageAnalysis.id})`);

//         // 测试 Analysis 表
//         console.log('7️⃣ 测试 Analysis 表...');
//         const analysis = await prisma.analysis.create({
//             data: {
//                 reportId: report.id,
//                 summary: '该卫生间需要进行全面的适老化改造',
//                 totalCost: '12000-15000元',
//                 priority: 'high',
//                 rawResponse: {
//                     model: 'qwen-vl-max',
//                     timestamp: new Date().toISOString(),
//                 },
//             },
//         });
//         console.log(`   ✅ Analysis 表正常 (ID: ${analysis.id})`);

//         // 测试关系查询
//         console.log('\n8️⃣ 测试关系查询...');
//         const fullReport = await prisma.report.findUnique({
//             where: { id: report.id },
//             include: {
//                 user: true,
//                 images: {
//                     include: {
//                         analysis: true,
//                     },
//                 },
//                 analysis: true,
//             },
//         });
//         console.log('   ✅ 关系查询正常');
//         console.log(`   包含: 用户 ✓ | ${fullReport?.images.length} 张图片 ✓ | 图片分析 ✓ | 整体分析 ✓`);

//         // 统计
//         console.log('\n📊 数据库统计:');
//         const stats = {
//             users: await prisma.user.count(),
//             sessions: await prisma.uploadSession.count(),
//             tempImages: await prisma.tempImage.count(),
//             reports: await prisma.report.count(),
//             images: await prisma.image.count(),
//             imageAnalyses: await prisma.imageAnalysis.count(),
//             analyses: await prisma.analysis.count(),
//         };
//         console.log(`   用户: ${stats.users}`);
//         console.log(`   上传会话: ${stats.sessions}`);
//         console.log(`   临时图片: ${stats.tempImages}`);
//         console.log(`   报告: ${stats.reports}`);
//         console.log(`   图片: ${stats.images}`);
//         console.log(`   图片分析: ${stats.imageAnalyses}`);
//         console.log(`   整体分析: ${stats.analyses}`);

//         console.log('\n🎉 所有表结构正常！数据库迁移成功！');

//         return { success: true, stats };

//     } catch (error) {
//         console.error('\n❌ 迁移测试失败:', error);
//         return { success: false, error };
//     } finally {
//         await prisma.$disconnect();
//     }
// }

// // 运行测试
// testMigration();