/**
 * PDF upload and storage utilities
 */
import { promises as fs } from "fs";
import path from "path";

const UPLOAD_DIR = path.join(process.cwd(), "uploads");

export async function savePdf(file: File): Promise<{ filePath: string; fileName: string }> {
  await fs.mkdir(UPLOAD_DIR, { recursive: true });
  const fileName = `${Date.now()}-${file.name.replace(/\s+/g, "-")}`;
  const filePath = path.join(UPLOAD_DIR, fileName);
  const buffer = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(filePath, buffer);
  return { filePath, fileName };
}

export async function readPdf(fileName: string): Promise<Buffer> {
  const filePath = path.join(UPLOAD_DIR, fileName);
  return fs.readFile(filePath);
}

// ⚠️ Production: replace with S3/OSS upload
// import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
// export async function uploadToS3(file: File) { ... }
