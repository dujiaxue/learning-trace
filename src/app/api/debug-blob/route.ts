import { NextResponse } from "next/server";
import { put } from "@vercel/blob";

export async function GET() {
  const results: any = {
    time: new Date().toISOString(),
    envKeys: Object.keys(process.env).filter(k => k.includes("BLOB") || k.includes("blob")),
    hasToken: !!process.env.BLOB_READ_WRITE_TOKEN,
    tests: [],
  };

  // Test 1: try access: "private"
  try {
    const blob = await put(`test/test-private-${Date.now()}.txt`, "hello", {
      access: "private",
      addRandomSuffix: false,
    });
    results.tests.push({ mode: "private", success: true, url: blob.url });
  } catch (e: any) {
    results.tests.push({ mode: "private", success: false, error: e?.message || String(e) });
  }

  // Test 2: try access: "public"
  try {
    const blob = await put(`test/test-public-${Date.now()}.txt`, "hello", {
      access: "public",
      addRandomSuffix: false,
    });
    results.tests.push({ mode: "public", success: true, url: blob.url });
  } catch (e: any) {
    results.tests.push({ mode: "public", success: false, error: e?.message || String(e) });
  }

  return NextResponse.json(results);
}
