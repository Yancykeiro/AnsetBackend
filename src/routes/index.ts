import { Elysia } from 'elysia';
import { healthRoutes } from './health';
import { testRoutes } from './test';
import { roomRoutes } from './rooms';

/**
 * 聚合所有路由
 * 
 * @description 统一管理和导出所有业务路由
 */
export const routes = new Elysia()
    .use(healthRoutes)
    .use(testRoutes)
    .use(roomRoutes);