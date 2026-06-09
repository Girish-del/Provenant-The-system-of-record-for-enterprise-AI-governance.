import {
  S3Client,
  PutObjectCommand,
  CreateBucketCommand,
  HeadBucketCommand,
} from '@aws-sdk/client-s3';
import { env } from '../env.js';

/**
 * S3 client for evidence storage. In dev, points at LocalStack (S3_ENDPOINT +
 * forcePathStyle); in prod, S3_ENDPOINT is unset and the real AWS endpoint is used.
 */
export const s3 = new S3Client({
  region: env.S3_REGION,
  endpoint: env.S3_ENDPOINT,
  forcePathStyle: Boolean(env.S3_ENDPOINT),
  credentials:
    env.S3_ACCESS_KEY_ID && env.S3_SECRET_ACCESS_KEY
      ? { accessKeyId: env.S3_ACCESS_KEY_ID, secretAccessKey: env.S3_SECRET_ACCESS_KEY }
      : undefined,
});

let bucketEnsured = false;
async function ensureBucket(): Promise<void> {
  if (bucketEnsured) {
    return;
  }
  try {
    await s3.send(new HeadBucketCommand({ Bucket: env.S3_BUCKET }));
  } catch {
    await s3.send(new CreateBucketCommand({ Bucket: env.S3_BUCKET }));
  }
  bucketEnsured = true;
}

export async function putObject(key: string, body: Buffer, contentType?: string): Promise<void> {
  await ensureBucket();
  await s3.send(
    new PutObjectCommand({ Bucket: env.S3_BUCKET, Key: key, Body: body, ContentType: contentType }),
  );
}
