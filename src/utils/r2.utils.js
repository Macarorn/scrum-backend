import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import config from "../config/config.js";

let s3Client = null;

// Initialize S3 client only if R2 credentials are provided
if (config.r2.accountId && config.r2.accessKeyId && config.r2.secretAccessKey) {
  s3Client = new S3Client({
    region: "auto",
    endpoint: `https://${config.r2.accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: config.r2.accessKeyId,
      secretAccessKey: config.r2.secretAccessKey,
    },
  });
}

/**
 * Uploads a file buffer to Cloudflare R2
 * @param {string} key - The destination path/filename in the bucket
 * @param {Buffer} buffer - The file buffer
 * @param {string} contentType - The MIME type of the file
 * @returns {Promise<Object>}
 */
export const uploadFile = async (key, buffer, contentType) => {
  if (!s3Client) throw new Error("Cloudflare R2 is not configured");

  const command = new PutObjectCommand({
    Bucket: config.r2.bucketName,
    Key: key,
    Body: buffer,
    ContentType: contentType,
  });

  return await s3Client.send(command);
};

/**
 * Generates a presigned URL to download a file from R2
 * @param {string} key - The path/filename in the bucket
 * @param {number} expiresIn - Expiration time in seconds (default 1 hour)
 * @returns {Promise<string>}
 */
export const getSignedDownloadUrl = async (key, expiresIn = 3600) => {
  if (!s3Client) throw new Error("Cloudflare R2 is not configured");

  const command = new GetObjectCommand({
    Bucket: config.r2.bucketName,
    Key: key,
  });

  return await getSignedUrl(s3Client, command, { expiresIn });
};

/**
 * Deletes a file from R2
 * @param {string} key - The path/filename in the bucket
 * @returns {Promise<Object>}
 */
export const deleteFile = async (key) => {
  if (!s3Client) throw new Error("Cloudflare R2 is not configured");

  const command = new DeleteObjectCommand({
    Bucket: config.r2.bucketName,
    Key: key,
  });

  return await s3Client.send(command);
};

export const isR2Configured = () => !!s3Client;
