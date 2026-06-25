import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    version: "blob-v5-pdf-proxy",
    time: new Date().toISOString(),
    hasBlobToken: !!process.env.BLOB_READ_WRITE_TOKEN,
    blobEnvKeys: Object.keys(process.env).filter(k => k.includes("BLOB") || k.includes("blob")),
  });
}
