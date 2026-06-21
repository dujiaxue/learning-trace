import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId, generateApiKey } from "@/lib/auth";

// GET /api/api-keys — list user's API keys
export async function GET(req: NextRequest) {
  const userId = await getUserId(req);

  const keys = await prisma.apiKey.findMany({
    where: { userId },
    select: {
      id: true,
      name: true,
      lastUsedAt: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ keys });
}

// POST /api/api-keys — create a new API key
export async function POST(req: NextRequest) {
  const { name } = await req.json();
  const userId = await getUserId(req);

  if (!name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  const key = generateApiKey();

  const apiKey = await prisma.apiKey.create({
    data: {
      userId,
      key,
      name,
    },
    select: {
      id: true,
      name: true,
      key: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ apiKey }, { status: 201 });
}

// DELETE /api/api-keys?id=xxx — delete an API key
export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  const userId = await getUserId(req);

  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  await prisma.apiKey.deleteMany({
    where: { id, userId },
  });

  return NextResponse.json({ success: true });
}
