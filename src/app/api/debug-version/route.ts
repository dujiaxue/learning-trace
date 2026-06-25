import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    version: "blob-v3-private",
    time: new Date().toISOString(),
    hasBlobToken: !!process.env.BLOB_READ_WRITE_TOKEN,
    blobEnvKeys: Object.keys(process.env).filter(k => k.includes("BLOB") || k.includes("blob")),
  });
}
