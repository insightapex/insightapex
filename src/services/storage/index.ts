/**
 * File storage service — Cloudflare R2-ready.
 *
 * Phase 1 ships this as a typed interface with a stub implementation so
 * question images / future certificate PDFs have a single integration
 * point. Once R2 credentials are available, implement uploadFile() using
 * the AWS S3-compatible SDK (R2 is S3-API compatible):
 *
 *   import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
 *   const r2 = new S3Client({
 *     region: "auto",
 *     endpoint: process.env.R2_ENDPOINT,
 *     credentials: {
 *       accessKeyId: process.env.R2_ACCESS_KEY_ID!,
 *       secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
 *     },
 *   });
 */

export interface UploadResult {
  url: string;
  key: string;
}

export async function uploadFile(_file: Buffer, _key: string, _contentType: string): Promise<UploadResult> {
  // TODO Phase 2: implement real R2 upload via S3-compatible SDK.
  throw new Error("File storage is not configured yet. Set R2_* environment variables and implement uploadFile().");
}

export function getPublicUrl(key: string): string {
  const base = process.env.R2_PUBLIC_BASE_URL ?? "";
  return `${base}/${key}`;
}
