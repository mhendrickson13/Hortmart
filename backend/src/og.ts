/**
 * Open Graph HTML page generator.
 * Generates a minimal HTML page with OG meta tags for social sharing,
 * and uploads it to S3 so CloudFront can serve it to crawlers.
 */
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';

const s3 = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' });
const BUCKET = process.env.S3_BUCKET || 'cxflowio';
const SITE_URL = process.env.FRONTEND_URL || 'https://lms.cxflow.io';
const S3_PREFIX = 'academy/og';

/**
 * Generate a minimal HTML page with Open Graph + Twitter Card meta tags.
 * Includes a JS redirect so real users land on the SPA immediately.
 */
function buildOgHtml(opts: {
  title: string;
  description: string;
  image?: string | null;
  url: string;
  siteName?: string;
}): string {
  const { title, description, image, url, siteName = 'CXFlow Academy' } = opts;
  const safeTitle = escapeHtml(title);
  const safeDesc = escapeHtml(truncate(description, 200));
  const safeUrl = escapeHtml(url);
  const safeSiteName = escapeHtml(siteName);
  const safeImage = image ? escapeHtml(image) : '';

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<title>${safeTitle} — ${safeSiteName}</title>
<meta name="description" content="${safeDesc}">

<!-- Open Graph -->
<meta property="og:type" content="website">
<meta property="og:site_name" content="${safeSiteName}">
<meta property="og:title" content="${safeTitle}">
<meta property="og:description" content="${safeDesc}">
<meta property="og:url" content="${safeUrl}">
${safeImage ? `<meta property="og:image" content="${safeImage}">\n<meta property="og:image:width" content="1200">\n<meta property="og:image:height" content="630">` : ''}

<!-- Twitter Card -->
<meta name="twitter:card" content="${safeImage ? 'summary_large_image' : 'summary'}">
<meta name="twitter:title" content="${safeTitle}">
<meta name="twitter:description" content="${safeDesc}">
${safeImage ? `<meta name="twitter:image" content="${safeImage}">` : ''}

<!-- Redirect real users to the SPA -->
<meta http-equiv="refresh" content="0;url=${safeUrl}">
<script>window.location.replace("${safeUrl}");</script>
</head>
<body>
<p>Redirecting to <a href="${safeUrl}">${safeTitle}</a>…</p>
</body>
</html>`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function truncate(str: string, max: number): string {
  if (!str) return '';
  // Strip HTML tags
  const plain = str.replace(/<[^>]*>/g, '').trim();
  if (plain.length <= max) return plain;
  return plain.slice(0, max - 1) + '…';
}

/**
 * Generate and upload an OG page for a course to S3.
 * Call this on course publish, and on course update (title/description/cover).
 */
export async function upsertCourseOgPage(course: {
  id: string;
  title: string;
  description?: string | null;
  subtitle?: string | null;
  coverImage?: string | null;
}): Promise<void> {
  try {
    const description = course.description || course.subtitle || course.title;
    const url = `${SITE_URL}/course/${course.id}`;
    const html = buildOgHtml({
      title: course.title,
      description,
      image: course.coverImage || null,
      url,
    });

    await s3.send(new PutObjectCommand({
      Bucket: BUCKET,
      Key: `${S3_PREFIX}/course/${course.id}.html`,
      Body: html,
      ContentType: 'text/html; charset=utf-8',
      CacheControl: 'public, max-age=300', // 5 min cache — updates propagate quickly
    }));

    console.log(`[OG] ✓ uploaded og page for course ${course.id}`);
  } catch (err) {
    console.error(`[OG] ✗ failed to upload og page for course ${course.id}:`, err);
  }
}

/**
 * Delete the OG page for a course from S3 (on course delete or unpublish).
 */
export async function deleteCourseOgPage(courseId: string): Promise<void> {
  try {
    await s3.send(new DeleteObjectCommand({
      Bucket: BUCKET,
      Key: `${S3_PREFIX}/course/${courseId}.html`,
    }));
    console.log(`[OG] ✓ deleted og page for course ${courseId}`);
  } catch (err) {
    console.error(`[OG] ✗ failed to delete og page for course ${courseId}:`, err);
  }
}
