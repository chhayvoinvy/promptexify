/* eslint-disable @typescript-eslint/no-explicit-any */
import prisma from "@/lib/prisma";

// Extendable debug utility. Currently instruments Prisma queries.
if (
  process.env.NODE_ENV === "development" &&
  process.env.DEBUG_PRISMA === "1"
) {
  (prisma as any).$on("query", (e: any) => {
    const time = Number(e.duration) || 0;
    if (time > 500) {
      console.warn(`[PRISMA][SLOW ${time}ms] ${e.query}`);
    } else if (process.env.DEBUG_PRISMA_VERBOSE === "1") {
      console.log(`[PRISMA][${time}ms] ${e.query}`);
    }
  });
}

export {};
