// Prisma client type extensions
import { PrismaClient } from "@prisma/client";

// Extend the PrismaClient type to include the user model
declare global {
  namespace PrismaNamespace {
    interface PrismaClient {
      user: {
        create: (args: any) => Promise<any>;
        findUnique: (args: any) => Promise<any>;
        findMany: (args: any) => Promise<any>;
        update: (args: any) => Promise<any>;
        delete: (args: any) => Promise<any>;
      };
    }
  }
}

// Create a typed Prisma client
export const createTypedPrismaClient = () => {
  const prisma = new PrismaClient();
  return prisma as PrismaClient & {
    user: {
      create: (args: any) => Promise<any>;
      findUnique: (args: any) => Promise<any>;
      findMany: (args: any) => Promise<any>;
      update: (args: any) => Promise<any>;
      delete: (args: any) => Promise<any>;
    };
  };
};
