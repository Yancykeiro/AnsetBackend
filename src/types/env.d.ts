// 环境变量类型声明
declare global {
    namespace NodeJS {
        interface ProcessEnv {
            DATABASE_URL: string;
            PORT?: string;
            HOST?: string;
            BASE_URL?: string;
            TONGYI_API_KEY?: string;
            TONGYI_ENDPOINT?: string;
            UPLOAD_DIR?: string;
            MAX_FILE_SIZE?: string;
            JWT_SECRET?: string;
            NODE_ENV?: 'development' | 'production' | 'test';
        }
    }
}

export { };
