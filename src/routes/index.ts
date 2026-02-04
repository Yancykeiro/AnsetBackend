import { Elysia } from 'elysia';
import { uploadRoutes } from './upload';
import { testRoutes } from './test';
import { reportRoutes } from './report';

/**
 * 聚合所有路由
 * 
 * @description 统一管理和导出所有业务路由
 */
export const routes = new Elysia()
    .use(uploadRoutes)
    .use(testRoutes)
    .use(reportRoutes);


// 房间类型+改造预算+图片+问卷
// 改造报告  列表

// 拍摄的临时图片上传成https图片
// 如果填写问卷，就先不调用分析
// 如果暂时跳过，就直接用预算+房间类型+图片，得分析结果