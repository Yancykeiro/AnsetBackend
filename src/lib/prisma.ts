import { PrismaClient } from '@prisma/client';

/**
 * Prisma Client 单例实例
 * 
 * @description 确保整个应用只有一个 Prisma Client 实例，避免连接池耗尽
 */
const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClient | undefined;
};

export const prisma =
    globalForPrisma.prisma ??
    new PrismaClient({
        log: process.env.NODE_ENV === 'development'
            ? ['query', 'error', 'warn']
            : ['error'],
    });

if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = prisma;
}

/**
 * 优雅关闭数据库连接
 * 
 * @description 应用关闭时调用，确保所有连接正确释放
 */
export async function disconnectPrisma(): Promise<void> {
    await prisma.$disconnect();
}