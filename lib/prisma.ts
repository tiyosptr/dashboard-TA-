import { PrismaClient } from '@prisma/client'

const RETRY_CODES = new Set(['P1017', 'P1001']);
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 300;

const prismaClientSingleton = () => {
    const client = new PrismaClient({
        log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    });

    // Prisma v6 uses $extends instead of deprecated $use
    return client.$extends({
        query: {
            $allModels: {
                async $allOperations({ operation, model, args, query }: any) {
                    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
                        try {
                            return await query(args);
                        } catch (err: any) {
                            const isRetryable =
                                RETRY_CODES.has(err?.code) ||
                                err?.message?.includes('Connection reset') ||
                                err?.message?.includes('closed the connection');

                            if (isRetryable && attempt < MAX_RETRIES) {
                                console.warn(`[Prisma] ${err.code} on ${model}.${operation} — retry ${attempt}/${MAX_RETRIES - 1}`);
                                await new Promise(res => setTimeout(res, RETRY_DELAY_MS * attempt));
                                continue;
                            }
                            throw err;
                        }
                    }
                },
            },
        },
    });
};

type PrismaClientSingleton = ReturnType<typeof prismaClientSingleton>;

declare const globalThis: {
    prismaGlobal: PrismaClientSingleton;
} & typeof global;

const prisma = globalThis.prismaGlobal ?? prismaClientSingleton();

export default prisma;

if (process.env.NODE_ENV !== 'production') globalThis.prismaGlobal = prisma;
