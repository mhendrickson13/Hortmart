import { Router } from 'express';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { authenticate } from '../middleware/auth.js';
import crypto from 'crypto';

const router = Router();

// S3 client — Lambda runtime provides @aws-sdk; no need to bundle
// Disable automatic checksums so presigned URLs work with simple browser PUT
const s3 = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  requestChecksumCalculation: 'WHEN_REQUIRED' as any,
  responseChecksumValidation: 'WHEN_REQUIRED' as any,
});
const BUCKET = process.env.S3_BUCKET || 'cxflowio';
const CDN_BASE = process.env.CDN_BASE_URL || 'https://cxflowio.s3.us-east-1.amazonaws.com';

// Allowed upload types
const ALLOWED_TYPES: Record<string, { extensions: string[]; maxSize: number; folder: string }> = {
  image: {
    extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'],
    maxSize: 10 * 1024 * 1024,
    folder: 'academy/uploads/images',
  },
  video: {
    extensions: ['mp4', 'webm', 'mov', 'avi', 'mkv'],
    maxSize: 2 * 1024 * 1024 * 1024,
    folder: 'academy/uploads/videos',
  },
  document: {
    extensions: ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'zip', 'rar'],
    maxSize: 100 * 1024 * 1024,
    folder: 'academy/uploads/documents',
  },
};

// Content-type mapping
const CONTENT_TYPES: Record<string, string> = {
  jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif',
  webp: 'image/webp', svg: 'image/svg+xml',
  mp4: 'video/mp4', webm: 'video/webm', mov: 'video/quicktime',
  avi: 'video/x-msvideo', mkv: 'video/x-matroska',
  pdf: 'application/pdf', doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ppt: 'application/vnd.ms-powerpoint',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  txt: 'text/plain', zip: 'application/zip', rar: 'application/x-rar-compressed',
};

router.post('/presigned', authenticate, async (req: any, res) => {
  try {
    const { fileName, fileType, fileSize } = req.body;

    if (!fileName || !fileType) {
      return res.status(400).json({ error: 'fileName and fileType are required' });
    }

    const typeConfig = ALLOWED_TYPES[fileType];
    if (!typeConfig) {
      return res.status(400).json({ error: `Invalid fileType. Must be one of: ${Object.keys(ALLOWED_TYPES).join(', ')}` });
    }

    const ext = fileName.split('.').pop()?.toLowerCase() || '';
    if (!typeConfig.extensions.includes(ext)) {
      return res.status(400).json({
        error: `File extension .${ext} not allowed for ${fileType}. Allowed: ${typeConfig.extensions.join(', ')}`,
      });
    }

    if (fileSize && fileSize > typeConfig.maxSize) {
      return res.status(400).json({
        error: `File too large. Max size for ${fileType}: ${Math.round(typeConfig.maxSize / 1024 / 1024)}MB`,
      });
    }

    const uniqueId = crypto.randomUUID();
    const sanitizedName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const key = `${typeConfig.folder}/${uniqueId}-${sanitizedName}`;
    const contentType = CONTENT_TYPES[ext] || 'application/octet-stream';

    const command = new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      ContentType: contentType,
    });

    const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 900 });
    const fileUrl = `${CDN_BASE}/${key}`;

    res.json({ uploadUrl, fileUrl, key });
  } catch (error) {
    console.error('[UPLOAD] Presigned URL error:', error);
    res.status(500).json({
      error: 'Failed to generate upload URL',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
