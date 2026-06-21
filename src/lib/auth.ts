import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Get userId from request.
 * Supports two auth methods:
 * 1. API Key via header: `Authorization: Bearer lt_xxx`
 * 2. Fallback to "demo-user" for web frontend (TODO: replace with NextAuth session)
 */
export async function getUserId(req: NextRequest): Promise<string> {
  const authHeader = req.headers.get("authorization");
  if (authHeader?.startsWith("Bearer lt_")) {
    const apiKey = authHeader.slice(7);
    const key = await prisma.apiKey.findUnique({
      where: { key: apiKey },
      select: { userId: true },
    });
    if (key) {
      // Update lastUsedAt (fire-and-forget)
      prisma.apiKey
        .update({ where: { id: apiKey }, data: { lastUsedAt: new Date() } })
        .catch(() => {});
      return key.userId;
    }
  }
  return "demo-user";
}

/**
 * Generate a new API key with `lt_` prefix
 */
export function generateApiKey(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let key = "lt_";
  for (let i = 0; i < 32; i++) {
    key += chars[Math.floor(Math.random() * chars.length)];
  }
  return key;
}
