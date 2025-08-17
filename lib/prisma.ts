import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    // Performance optimizations
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
    // Connection pooling for better performance
    // Note: This requires a connection pooler like PgBouncer in production
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
