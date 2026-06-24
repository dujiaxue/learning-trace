import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    version: "blob-v2-debug",
    time: new Date().toISOString(),
    hasBlobToken: !!process.env.BLOB_READ_WRITE_TOKEN,
  });
}
