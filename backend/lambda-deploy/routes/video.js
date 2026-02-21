"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.submitEncodingJob = submitEncodingJob;
exports.extractS3Key = extractS3Key;
const express_1 = require("express");
const crypto_1 = require("crypto");
const fs_1 = require("fs");
const path_1 = require("path");
const db_js_1 = require("../db.js");
const auth_js_1 = require("../middleware/auth.js");
const router = (0, express_1.Router)();
// ── Config ──────────────────────────────────────────────────────────────────
const BUCKET = process.env.S3_BUCKET || 'cxflowio';
const REGION = process.env.AWS_REGION || 'us-east-1';
const CF_DOMAIN = process.env.CF_DOMAIN || 'd224go81z1q461.cloudfront.net';
const CF_KEY_PAIR_ID = process.env.CF_KEY_PAIR_ID || 'K2MBVT2VFASMSM';
const MC_ROLE_ARN = process.env.MC_ROLE_ARN || 'arn:aws:iam::855436543387:role/MediaConvertS3AccessRole';
const MC_ENDPOINT = process.env.MC_ENDPOINT || 'https://mediaconvert.us-east-1.amazonaws.com';
const SIGNED_URL_EXPIRES_SECONDS = 4 * 60 * 60; // 4 hours
// ── CloudFront Signed URL (custom policy with wildcard) ─────────────────────
let _cfPrivateKey = null;
function getCfPrivateKey() {
    if (_cfPrivateKey)
        return _cfPrivateKey;
    // In Lambda the key is next to the bundled JS files
    const paths = [
        (0, path_1.join)(__dirname, '..', 'cf-private-key.pem'), // lambda-deploy/../cf-private-key.pem
        (0, path_1.join)(__dirname, 'cf-private-key.pem'), // same directory
        (0, path_1.join)(process.cwd(), 'cf-private-key.pem'), // cwd
    ];
    for (const p of paths) {
        try {
            _cfPrivateKey = (0, fs_1.readFileSync)(p, 'utf-8');
            console.log('[VIDEO] Loaded CF private key from', p);
            return _cfPrivateKey;
        }
        catch { /* try next */ }
    }
    throw new Error('CloudFront private key not found');
}
function toUrlSafeBase64(buf) {
    return buf.toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '~')
        .replace(/=/g, '_');
}
/**
 * Generate CloudFront signed URL parameters using a custom policy (wildcard).
 * The same signing params work for any URL under the given resource pattern.
 */
function generateSigningParams(resourcePattern, expiresEpoch) {
    const policy = JSON.stringify({
        Statement: [{
                Resource: resourcePattern,
                Condition: {
                    DateLessThan: { 'AWS:EpochTime': expiresEpoch },
                },
            }],
    });
    const policyB64 = toUrlSafeBase64(Buffer.from(policy, 'utf-8'));
    const sign = (0, crypto_1.createSign)('RSA-SHA1');
    sign.update(policy);
    const signature = toUrlSafeBase64(sign.sign(getCfPrivateKey()));
    return {
        Policy: policyB64,
        Signature: signature,
        'Key-Pair-Id': CF_KEY_PAIR_ID,
    };
}
function signUrl(url, params) {
    const sep = url.includes('?') ? '&' : '?';
    return `${url}${sep}Policy=${params.Policy}&Signature=${params.Signature}&Key-Pair-Id=${params['Key-Pair-Id']}`;
}
// ── MediaConvert Job Helpers ────────────────────────────────────────────────
async function submitEncodingJob(sourceKey, lessonId) {
    const { MediaConvertClient, CreateJobCommand } = await import('@aws-sdk/client-mediaconvert');
    const client = new MediaConvertClient({
        region: REGION,
        endpoint: MC_ENDPOINT,
    });
    const inputS3 = `s3://${BUCKET}/${sourceKey}`;
    const outputS3 = `s3://${BUCKET}/academy/encoded/${lessonId}/`;
    const command = new CreateJobCommand({
        Role: MC_ROLE_ARN,
        Settings: {
            Inputs: [{
                    FileInput: inputS3,
                    AudioSelectors: {
                        'Audio Selector 1': { DefaultSelection: 'DEFAULT' },
                    },
                    VideoSelector: {},
                }],
            OutputGroups: [
                {
                    Name: 'HLS',
                    OutputGroupSettings: {
                        Type: 'HLS_GROUP_SETTINGS',
                        HlsGroupSettings: {
                            Destination: outputS3,
                            SegmentLength: 6,
                            MinSegmentLength: 0,
                            SegmentControl: 'SEGMENTED_FILES',
                            ManifestCompression: 'NONE',
                        },
                    },
                    Outputs: [
                        // 720p
                        {
                            NameModifier: '_720p',
                            ContainerSettings: {
                                Container: 'M3U8',
                            },
                            VideoDescription: {
                                Width: 1280,
                                Height: 720,
                                CodecSettings: {
                                    Codec: 'H_264',
                                    H264Settings: {
                                        RateControlMode: 'QVBR',
                                        MaxBitrate: 3000000,
                                        QvbrSettings: { QvbrQualityLevel: 7 },
                                        SceneChangeDetect: 'TRANSITION_DETECTION',
                                    },
                                },
                            },
                            AudioDescriptions: [{
                                    CodecSettings: {
                                        Codec: 'AAC',
                                        AacSettings: {
                                            Bitrate: 128000,
                                            CodingMode: 'CODING_MODE_2_0',
                                            SampleRate: 48000,
                                        },
                                    },
                                }],
                        },
                        // 480p
                        {
                            NameModifier: '_480p',
                            ContainerSettings: {
                                Container: 'M3U8',
                            },
                            VideoDescription: {
                                Width: 854,
                                Height: 480,
                                CodecSettings: {
                                    Codec: 'H_264',
                                    H264Settings: {
                                        RateControlMode: 'QVBR',
                                        MaxBitrate: 1500000,
                                        QvbrSettings: { QvbrQualityLevel: 7 },
                                        SceneChangeDetect: 'TRANSITION_DETECTION',
                                    },
                                },
                            },
                            AudioDescriptions: [{
                                    CodecSettings: {
                                        Codec: 'AAC',
                                        AacSettings: {
                                            Bitrate: 96000,
                                            CodingMode: 'CODING_MODE_2_0',
                                            SampleRate: 48000,
                                        },
                                    },
                                }],
                        },
                        // 360p
                        {
                            NameModifier: '_360p',
                            ContainerSettings: {
                                Container: 'M3U8',
                            },
                            VideoDescription: {
                                Width: 640,
                                Height: 360,
                                CodecSettings: {
                                    Codec: 'H_264',
                                    H264Settings: {
                                        RateControlMode: 'QVBR',
                                        MaxBitrate: 800000,
                                        QvbrSettings: { QvbrQualityLevel: 7 },
                                        SceneChangeDetect: 'TRANSITION_DETECTION',
                                    },
                                },
                            },
                            AudioDescriptions: [{
                                    CodecSettings: {
                                        Codec: 'AAC',
                                        AacSettings: {
                                            Bitrate: 64000,
                                            CodingMode: 'CODING_MODE_2_0',
                                            SampleRate: 48000,
                                        },
                                    },
                                }],
                        },
                    ],
                },
            ],
        },
        Tags: {
            lessonId,
            app: 'cxflow-lms',
        },
    });
    const result = await client.send(command);
    const jobId = result.Job?.Id;
    if (!jobId)
        throw new Error('No jobId returned from MediaConvert');
    return jobId;
}
async function getJobStatus(jobId) {
    const { MediaConvertClient, GetJobCommand } = await import('@aws-sdk/client-mediaconvert');
    const client = new MediaConvertClient({
        region: REGION,
        endpoint: MC_ENDPOINT,
    });
    const result = await client.send(new GetJobCommand({ Id: jobId }));
    const job = result.Job;
    if (!job)
        throw new Error('Job not found');
    return {
        status: job.Status || 'UNKNOWN',
        progress: job.JobPercentComplete,
        errorMessage: job.ErrorMessage,
    };
}
// ── Helper: Extract S3 key from URL ─────────────────────────────────────────
function extractS3Key(url) {
    // Handles: https://bucket.s3.region.amazonaws.com/key
    //          https://bucket.s3.amazonaws.com/key
    //          https://s3.region.amazonaws.com/bucket/key
    const patterns = [
        new RegExp(`^https?://${BUCKET}\\.s3[.-][^/]+\\.amazonaws\\.com/(.+)$`),
        new RegExp(`^https?://s3[.-][^/]+\\.amazonaws\\.com/${BUCKET}/(.+)$`),
        new RegExp(`^https?://[^/]*cloudfront\\.net/(.+)$`),
    ];
    for (const p of patterns) {
        const m = url.match(p);
        if (m)
            return decodeURIComponent(m[1].split('?')[0]);
    }
    return null;
}
// ── Helper: Check encoding status and finalize if complete ──────────────────
async function checkAndFinalizeEncoding(lessonId, encodingJobId) {
    // Race-condition guard: verify this job is still the active one for the lesson
    const currentLesson = await (0, db_js_1.queryOne)('SELECT encodingJobId FROM lessons WHERE id = ?', [lessonId]);
    if (currentLesson && currentLesson.encodingJobId !== encodingJobId) {
        console.warn(`[VIDEO] Stale job ${encodingJobId} — lesson ${lessonId} now has job ${currentLesson.encodingJobId}. Ignoring.`);
        return { videoStatus: 'encoding', jobProgress: 0 };
    }
    const jobStatus = await getJobStatus(encodingJobId);
    console.log(`[VIDEO] Job ${encodingJobId} status: ${jobStatus.status} (${jobStatus.progress}%)`);
    if (jobStatus.status === 'COMPLETE') {
        const { S3Client, ListObjectsV2Command, DeleteObjectCommand } = await import('@aws-sdk/client-s3');
        const s3 = new S3Client({ region: REGION });
        const prefix = `academy/encoded/${lessonId}/`;
        const listResult = await s3.send(new ListObjectsV2Command({
            Bucket: BUCKET,
            Prefix: prefix,
        }));
        const manifests = (listResult.Contents || [])
            .map(o => o.Key)
            .filter(k => k.endsWith('.m3u8'));
        if (manifests.length === 0) {
            console.error(`[VIDEO] Encoding COMPLETE but no .m3u8 manifests found under ${prefix}`);
            await (0, db_js_1.execute)('UPDATE lessons SET videoStatus = ?, updatedAt = ? WHERE id = ?', ['error', (0, db_js_1.now)(), lessonId]);
            return { videoStatus: 'error', errorMessage: 'Encoding completed but no manifest files found' };
        }
        const masterManifest = manifests.find(k => !/_\d+p/.test(k)) || manifests[0];
        const hlsUrl = masterManifest;
        // Get the lesson to find the raw videoUrl before updating
        const lessonRow = await (0, db_js_1.queryOne)('SELECT videoUrl, encodingJobId FROM lessons WHERE id = ?', [lessonId]);
        // Double-check the job still matches (could have changed during S3 listing)
        if (lessonRow && lessonRow.encodingJobId !== encodingJobId) {
            console.warn(`[VIDEO] Job ${encodingJobId} completed but lesson ${lessonId} moved to job ${lessonRow.encodingJobId}. Skipping finalization.`);
            return { videoStatus: 'encoding', jobProgress: 0 };
        }
        await (0, db_js_1.execute)('UPDATE lessons SET videoStatus = ?, hlsUrl = ?, updatedAt = ? WHERE id = ?', ['ready', hlsUrl, (0, db_js_1.now)(), lessonId]);
        // Delete raw video from S3 after encoding completes
        if (lessonRow?.videoUrl) {
            const rawKey = extractS3Key(lessonRow.videoUrl);
            if (rawKey) {
                try {
                    await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: rawKey }));
                    await (0, db_js_1.execute)('UPDATE lessons SET videoUrl = NULL, updatedAt = ? WHERE id = ?', [(0, db_js_1.now)(), lessonId]);
                    console.log(`[VIDEO] Deleted raw video: ${rawKey}`);
                }
                catch (delErr) {
                    console.warn(`[VIDEO] Failed to delete raw video ${rawKey}:`, delErr);
                }
            }
        }
        return { videoStatus: 'ready', hlsUrl, jobProgress: 100 };
    }
    if (jobStatus.status === 'ERROR') {
        await (0, db_js_1.execute)('UPDATE lessons SET videoStatus = ?, updatedAt = ? WHERE id = ?', ['error', (0, db_js_1.now)(), lessonId]);
        return { videoStatus: 'error', errorMessage: jobStatus.errorMessage };
    }
    return { videoStatus: 'encoding', jobProgress: jobStatus.progress || 0 };
}
// ═══════════════════════════════════════════════════════════════════════════
// ROUTES
// ═══════════════════════════════════════════════════════════════════════════
/**
 * POST /video/encode/:lessonId
 * Trigger MediaConvert HLS encoding for a lesson's video.
 * Only the course creator or admin can trigger encoding.
 */
router.post('/encode/:lessonId', auth_js_1.authenticate, async (req, res) => {
    try {
        const { lessonId } = req.params;
        // Get lesson + ownership check
        const lesson = await (0, db_js_1.queryOne)('SELECT * FROM lessons WHERE id = ?', [lessonId]);
        if (!lesson)
            return res.status(404).json({ error: 'Lesson not found' });
        const mod = await (0, db_js_1.queryOne)('SELECT courseId FROM modules WHERE id = ?', [lesson.moduleId]);
        const course = await (0, db_js_1.queryOne)('SELECT creatorId FROM courses WHERE id = ?', [mod?.courseId]);
        if (!course || (course.creatorId !== req.user.id && req.user.role !== 'ADMIN')) {
            return res.status(403).json({ error: 'Access denied' });
        }
        if (!lesson.videoUrl) {
            return res.status(400).json({ error: 'Lesson has no video URL to encode' });
        }
        // Extract S3 key from the videoUrl
        const sourceKey = extractS3Key(lesson.videoUrl);
        if (!sourceKey) {
            return res.status(400).json({ error: 'Video URL is not a recognizable S3 URL. Only uploaded videos can be encoded.' });
        }
        // Check if already encoding
        if (lesson.videoStatus === 'encoding') {
            return res.status(409).json({ error: 'Encoding already in progress', encodingJobId: lesson.encodingJobId });
        }
        console.log(`[VIDEO] Submitting encoding job for lesson ${lessonId}, source: ${sourceKey}`);
        const jobId = await submitEncodingJob(sourceKey, lessonId);
        // Update lesson with encoding status — hlsUrl set to NULL until encoding completes
        await (0, db_js_1.execute)('UPDATE lessons SET videoStatus = ?, encodingJobId = ?, hlsUrl = NULL, updatedAt = ? WHERE id = ?', ['encoding', jobId, (0, db_js_1.now)(), lessonId]);
        console.log(`[VIDEO] Encoding job submitted: ${jobId}`);
        res.json({
            message: 'Encoding job submitted',
            jobId,
            videoStatus: 'encoding',
        });
    }
    catch (error) {
        console.error('[VIDEO] Encode error:', error);
        res.status(500).json({
            error: 'Failed to start encoding',
            details: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});
/**
 * GET /video/status/:lessonId
 * Check encoding status. If the job is complete, update lesson record.
 * Creator or admin can check. Enrolled learners can also check.
 */
router.get('/status/:lessonId', auth_js_1.authenticate, async (req, res) => {
    try {
        const { lessonId } = req.params;
        const lesson = await (0, db_js_1.queryOne)('SELECT * FROM lessons WHERE id = ?', [lessonId]);
        if (!lesson)
            return res.status(404).json({ error: 'Lesson not found' });
        // If no encoding job, just return current status
        if (!lesson.encodingJobId) {
            // Auto-retry: if status is error but raw video exists, re-trigger encoding
            if (lesson.videoStatus === 'error' && lesson.videoUrl) {
                const sourceKey = extractS3Key(lesson.videoUrl);
                if (sourceKey) {
                    try {
                        console.log(`[VIDEO] Auto-retrying encoding (status check) for lesson ${lessonId}`);
                        const jobId = await submitEncodingJob(sourceKey, lessonId);
                        await (0, db_js_1.execute)('UPDATE lessons SET videoStatus = ?, encodingJobId = ?, hlsUrl = NULL, updatedAt = ? WHERE id = ?', ['encoding', jobId, (0, db_js_1.now)(), lessonId]);
                        return res.json({ videoStatus: 'encoding', encodingJobId: jobId, jobProgress: 0 });
                    }
                    catch (retryErr) {
                        console.error(`[VIDEO] Auto-retry encoding failed:`, retryErr);
                    }
                }
            }
            return res.json({
                videoStatus: lesson.videoStatus || 'none',
                hlsUrl: lesson.hlsUrl || null,
            });
        }
        // If already marked ready, return immediately
        if (lesson.videoStatus === 'ready') {
            return res.json({
                videoStatus: 'ready',
                hlsUrl: lesson.hlsUrl,
            });
        }
        // Auto-retry: if status is error but raw video still exists, re-trigger
        if (lesson.videoStatus === 'error' && lesson.videoUrl) {
            const sourceKey = extractS3Key(lesson.videoUrl);
            if (sourceKey) {
                try {
                    console.log(`[VIDEO] Auto-retrying encoding (status check) for lesson ${lessonId}`);
                    const jobId = await submitEncodingJob(sourceKey, lessonId);
                    await (0, db_js_1.execute)('UPDATE lessons SET videoStatus = ?, encodingJobId = ?, hlsUrl = NULL, updatedAt = ? WHERE id = ?', ['encoding', jobId, (0, db_js_1.now)(), lessonId]);
                    return res.json({ videoStatus: 'encoding', encodingJobId: jobId, jobProgress: 0 });
                }
                catch (retryErr) {
                    console.error(`[VIDEO] Auto-retry encoding failed:`, retryErr);
                }
            }
        }
        // Check MediaConvert and finalize if complete (also deletes raw video)
        const result = await checkAndFinalizeEncoding(lessonId, lesson.encodingJobId);
        return res.json(result);
    }
    catch (error) {
        console.error('[VIDEO] Status check error:', error);
        res.status(500).json({
            error: 'Failed to check encoding status',
            details: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});
/**
 * GET /video/signed-url/:lessonId
 * Generate a CloudFront signed URL for HLS playback.
 * Returns the signed manifest URL and signing params for chunk requests.
 * Requires enrollment (or creator/admin access).
 */
router.get('/signed-url/:lessonId', auth_js_1.authenticate, async (req, res) => {
    try {
        const { lessonId } = req.params;
        let lesson = await (0, db_js_1.queryOne)('SELECT * FROM lessons WHERE id = ?', [lessonId]);
        if (!lesson)
            return res.status(404).json({ error: 'Lesson not found' });
        // If encoding is in progress, check MediaConvert and finalize if complete
        if (lesson.videoStatus === 'encoding' && lesson.encodingJobId) {
            const result = await checkAndFinalizeEncoding(lessonId, lesson.encodingJobId);
            if (result.videoStatus === 'ready') {
                // Re-fetch the updated lesson
                lesson = await (0, db_js_1.queryOne)('SELECT * FROM lessons WHERE id = ?', [lessonId]);
            }
        }
        // Auto-retry: if encoding previously failed but raw video still exists, re-trigger
        if (lesson.videoStatus === 'error' && lesson.videoUrl) {
            const sourceKey = extractS3Key(lesson.videoUrl);
            if (sourceKey) {
                try {
                    console.log(`[VIDEO] Auto-retrying encoding for lesson ${lessonId}, source: ${sourceKey}`);
                    const jobId = await submitEncodingJob(sourceKey, lessonId);
                    await (0, db_js_1.execute)('UPDATE lessons SET videoStatus = ?, encodingJobId = ?, hlsUrl = NULL, updatedAt = ? WHERE id = ?', ['encoding', jobId, (0, db_js_1.now)(), lessonId]);
                    console.log(`[VIDEO] Auto-retry encoding started, job: ${jobId}`);
                    // Return 400 so the frontend falls through to status polling
                    return res.status(400).json({
                        error: 'Video encoding was retried automatically. Please wait.',
                        videoStatus: 'encoding',
                    });
                }
                catch (retryErr) {
                    console.error(`[VIDEO] Auto-retry encoding failed for lesson ${lessonId}:`, retryErr);
                }
            }
        }
        if (lesson.videoStatus !== 'ready' || !lesson.hlsUrl) {
            return res.status(400).json({ error: 'Video is not ready for playback', videoStatus: lesson.videoStatus });
        }
        // Access check: enrolled user, or creator/admin
        const mod = await (0, db_js_1.queryOne)('SELECT courseId FROM modules WHERE id = ?', [lesson.moduleId]);
        const course = await (0, db_js_1.queryOne)('SELECT creatorId, status FROM courses WHERE id = ?', [mod?.courseId]);
        const isOwner = course && (course.creatorId === req.user.id || req.user.role === 'ADMIN');
        let isEnrolled = false;
        if (!isOwner) {
            const enrollment = await (0, db_js_1.queryOne)('SELECT id FROM enrollments WHERE userId = ? AND courseId = ?', [req.user.id, mod?.courseId]);
            isEnrolled = !!enrollment;
        }
        if (!isOwner && !isEnrolled) {
            // Allow free preview lessons
            if (!lesson.isFreePreview) {
                return res.status(403).json({ error: 'Not enrolled in this course' });
            }
        }
        // Generate signed URL with custom policy (wildcard for all chunks)
        // CloudFront origin path is /academy, so strip the academy/ prefix from S3 keys
        const cfPath = lesson.hlsUrl.replace(/^academy\//, '');
        const cfFolder = `encoded/${lessonId}`;
        const expiresEpoch = Math.floor(Date.now() / 1000) + SIGNED_URL_EXPIRES_SECONDS;
        const resourcePattern = `https://${CF_DOMAIN}/${cfFolder}/*`;
        const signingParams = generateSigningParams(resourcePattern, expiresEpoch);
        const manifestUrl = `https://${CF_DOMAIN}/${cfPath}`;
        const signedManifestUrl = signUrl(manifestUrl, signingParams);
        res.json({
            signedManifestUrl,
            // Provide signing params so frontend can sign chunk requests too
            signingParams: {
                Policy: signingParams.Policy,
                Signature: signingParams.Signature,
                KeyPairId: signingParams['Key-Pair-Id'],
                expires: expiresEpoch,
            },
            cfDomain: CF_DOMAIN,
        });
    }
    catch (error) {
        console.error('[VIDEO] Signed URL error:', error);
        res.status(500).json({
            error: 'Failed to generate signed URL',
            details: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});
exports.default = router;
//# sourceMappingURL=video.js.map