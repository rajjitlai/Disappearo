import { NextRequest, NextResponse } from 'next/server';
import { Filter } from 'content-checker';
import { Client, Storage } from 'appwrite';

// Simple in-memory rate limiter per IP
const RATE_LIMIT_WINDOW_MS = 60_000; // 1m
const RATE_LIMIT_MAX = 60; // 60 requests/min
const bucket = new Map<string, { count: number; reset: number }>();

// Initialize Appwrite client for server-side operations
const appwriteEndpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
const appwriteProject = process.env.NEXT_PUBLIC_APPWRITE_PROJECT;

console.log('Appwrite configuration:', {
    endpoint: appwriteEndpoint ? 'Present' : 'Missing',
    project: appwriteProject ? 'Present' : 'Missing'
});

const appwriteClient = new Client()
    .setEndpoint(appwriteEndpoint!)
    .setProject(appwriteProject!);

const storage = new Storage(appwriteClient);

function rateLimit(ip: string) {
    const entry = bucket.get(ip);
    if (!entry || Date.now() > entry.reset) {
        bucket.set(ip, { count: 1, reset: Date.now() + RATE_LIMIT_WINDOW_MS });
        return { ok: true };
    }
    if (entry.count >= RATE_LIMIT_MAX) return { ok: false, retryAfter: Math.ceil((entry.reset - Date.now()) / 1000) };
    entry.count += 1;
    return { ok: true };
}

type Body =
    | { type: 'text'; content: string }
    | { type: 'image'; fileId: string; bucketId: string }
    | { type: 'image'; fileData: string; fileName: string; fileType: string };

// Initialize content-checker filter
function getContentFilter() {
    const apiKey = process.env.OPENMODERATOR_API_KEY || process.env.NEXT_PUBLIC_OPENMODERATOR_API_KEY;
    console.log('Initializing content filter with API key:', apiKey ? `Present (${apiKey.length} chars)` : 'Not present');

    if (!apiKey) {
        console.warn('OPENMODERATOR_API_KEY not set, using fallback moderation only');
        return new Filter();
    }

    try {
        const filter = new Filter({ openModeratorAPIKey: apiKey });
        console.log('Content filter initialized successfully with API key');
        return filter;
    } catch (error) {
        console.error('Failed to initialize content filter:', error);
        console.warn('Falling back to basic filter without API key');
        return new Filter();
    }
}

// AI-powered text moderation using content-checker
async function moderateTextAI(text: string) {
    const filter = getContentFilter();

    try {
        const response = await filter.isProfaneAI(text, {
            checkManualProfanityList: false, // Skip manual list for better performance
            provider: "google-perspective-api" // Use Google's Perspective API
        });

        return {
            blocked: response.profane,
            reason: response.profane ? 'ai_moderation' : 'passed',
            score: {
                profane: response.profane,
                types: response.type,
                toxicity: response.type.includes('TOXICITY') ? 1 : 0,
                severe_toxicity: response.type.includes('SEVERE_TOXICITY') ? 1 : 0,
                harassment: response.type.includes('HARASSMENT') ? 1 : 0,
                hate: response.type.includes('HATE') ? 1 : 0
            }
        };
    } catch (error) {
        console.error('AI text moderation failed:', error);
        throw error;
    }
}

// AI-powered image moderation using content-checker with base64 data
async function moderateImageAIFromBase64(fileData: string, fileName: string, fileType: string) {
    const filter = getContentFilter();

    try {
        console.log('Server-side image moderation requested for base64 file:', fileName);
        console.log('Filter initialized:', !!filter);

        // Convert base64 data URL to File object
        console.log('Converting base64 data to file...');
        const base64Data = fileData.split(',')[1]; // Remove data:image/jpeg;base64, prefix
        const binaryData = Buffer.from(base64Data, 'base64');
        const blob = new Blob([binaryData], { type: fileType });
        const file = new File([blob], fileName, { type: fileType });

        console.log('File object created for moderation:', {
            name: file.name,
            size: file.size,
            type: file.type
        });

        // Run image moderation
        console.log('Running image moderation with content-checker...');
        const result = await filter.isImageNSFW(file);
        console.log('Image moderation completed successfully:', result);

        return {
            blocked: result?.nsfw || false,
            reason: result?.nsfw ? 'ai_image_moderation' : 'passed',
            score: {
                nsfw: result?.nsfw || false,
                types: result?.types || []
            }
        };
    } catch (error) {
        console.error('AI image moderation failed with detailed error:', error);
        const err = error as Error;
        console.error('Error name:', err.name);
        console.error('Error message:', err.message);
        console.error('Error stack:', err.stack);

        // Check if it's an API quota/rate limit issue
        const isAPIError = err.message.includes('HTTP error! status: 500') ||
            err.message.includes('HTTP error! status: 429') ||
            err.message.includes('quota') ||
            err.message.includes('rate limit');

        if (isAPIError) {
            console.warn('OpenModerator API error detected - likely quota exceeded or service issue');
            return {
                blocked: false,
                reason: 'api_error',
                score: {
                    error: 'api_error',
                    note: 'OpenModerator API error - allowing upload (check API quota)',
                    errorDetails: {
                        name: err.name,
                        message: err.message,
                        suggestion: 'Check OpenModerator API quota and billing'
                    }
                }
            };
        }

        // For other errors, allow upload but log the error
        return {
            blocked: false,
            reason: 'moderation_failed',
            score: {
                error: 'moderation_failed',
                note: 'Image moderation failed, allowing upload',
                errorDetails: {
                    name: err.name,
                    message: err.message
                }
            }
        };
    }
}

// AI-powered image moderation using content-checker (legacy - for fileId/bucketId)
async function moderateImageAI(fileId: string, bucketId: string) {
    const filter = getContentFilter();

    try {
        console.log('Server-side image moderation requested for file:', fileId);
        console.log('Using bucket ID:', bucketId);
        console.log('Filter initialized:', !!filter);

        // Try to get the file URL first
        console.log('Getting file URL from Appwrite storage...');
        const fileUrl = storage.getFileView(bucketId, fileId).toString();
        console.log('File URL:', fileUrl);

        // Download the file using fetch
        console.log('Downloading file from URL...');
        const response = await fetch(fileUrl);
        console.log('Download response status:', response.status);
        console.log('Download response headers:', Object.fromEntries(response.headers.entries()));

        if (!response.ok) {
            throw new Error(`Failed to download file: ${response.status} ${response.statusText}`);
        }

        const fileBuffer = await response.arrayBuffer();
        console.log('File downloaded successfully, size:', fileBuffer.byteLength, 'bytes');

        // Convert to Blob
        console.log('Converting array buffer to blob...');
        const blob = new Blob([fileBuffer], { type: response.headers.get('content-type') || 'image/jpeg' });
        console.log('Blob created, size:', blob.size, 'type:', blob.type);

        const file = new File([blob], 'image.jpg', { type: blob.type });
        console.log('File object created for moderation');

        // Run image moderation
        console.log('Running image moderation with content-checker...');
        console.log('File details for moderation:', {
            name: file.name,
            size: file.size,
            type: file.type
        });

        const result = await filter.isImageNSFW(file);
        console.log('Image moderation completed successfully:', result);

        return {
            blocked: result?.nsfw || false,
            reason: result?.nsfw ? 'ai_image_moderation' : 'passed',
            score: {
                nsfw: result?.nsfw || false,
                types: result?.types || []
            }
        };
    } catch (error) {
        console.error('AI image moderation failed with detailed error:', error);
        const err = error as Error;
        console.error('Error name:', err.name);
        console.error('Error message:', err.message);
        console.error('Error stack:', err.stack);

        // Check if it's an API quota/rate limit issue
        const isAPIError = err.message.includes('HTTP error! status: 500') ||
            err.message.includes('HTTP error! status: 429') ||
            err.message.includes('quota') ||
            err.message.includes('rate limit');

        if (isAPIError) {
            console.warn('OpenModerator API error detected - likely quota exceeded or service issue');
            return {
                blocked: false,
                reason: 'api_error',
                score: {
                    error: 'api_error',
                    note: 'OpenModerator API error - allowing upload (check API quota)',
                    errorDetails: {
                        name: err.name,
                        message: err.message,
                        suggestion: 'Check OpenModerator API quota and billing'
                    }
                }
            };
        }

        // For other errors, allow upload but log the error
        return {
            blocked: false,
            reason: 'moderation_failed',
            score: {
                error: 'moderation_failed',
                note: 'Image moderation failed, allowing upload',
                errorDetails: {
                    name: err.name,
                    message: err.message
                }
            }
        };
    }
}

// Fallback text moderation using bad-words.txt
async function moderateTextFallback(text: string) {
    const fs = await import('fs');
    const path = await import('path');

    try {
        const badWordsPath = path.join(process.cwd(), 'bad-words.txt');
        const badWordsContent = fs.readFileSync(badWordsPath, 'utf-8');
        const badWords = badWordsContent
            .split('\n')
            .slice(1) // Skip header
            .map(line => line.split(',')[0].toLowerCase().trim())
            .filter(word => word.length > 0);

        const words = text.toLowerCase().split(/\s+/);
        const foundBadWords = words.filter(word =>
            badWords.some(badWord =>
                word === badWord
            )
        );

        return {
            blocked: foundBadWords.length > 0,
            reason: foundBadWords.length > 0 ? 'bad_words_fallback' : 'passed',
            score: { badWords: foundBadWords.length, foundWords: foundBadWords }
        };
    } catch (error) {
        // If fallback fails, allow the message
        console.error('Text fallback moderation failed:', error);
        return { blocked: false, reason: 'fallback_failed', score: { error: 'fallback_failed' } };
    }
}

async function moderateText(text: string) {
    // Use AI moderation if enabled and API key is available
    const useAI = process.env.USE_OPENMODERATOR_MODERATION === 'true' && process.env.OPENMODERATOR_API_KEY;

    if (useAI) {
        try {
            const aiCheck = await moderateTextAI(text);
            return {
                blocked: aiCheck.blocked,
                reason: aiCheck.reason,
                score: aiCheck.score
            };
        } catch (error) {
            console.log('AI text moderation failed, using fallback moderation:', error);
        }
    }

    // Use fast fallback moderation
    return await moderateTextFallback(text);
}

export async function POST(req: NextRequest) {
    try {
        const ip = req.headers.get('x-forwarded-for') || 'anon';
        const rl = rateLimit(Array.isArray(ip) ? ip[0] : ip);
        if (!rl.ok) return NextResponse.json({ ok: false, error: 'Rate limited' }, { status: 429, headers: { 'Retry-After': String(rl.retryAfter || 60) } });
        const body = (await req.json()) as Body;
        if (body.type === 'text') {
            const res = await moderateText(body.content);
            return NextResponse.json({
                ok: !res.blocked,
                reason: res.reason,
                score: res.score,
            });
        }

        if (body.type === 'image') {
            const disableImageModeration = process.env.DISABLE_IMAGE_MODERATION === 'true';
            if (disableImageModeration) {
                return NextResponse.json({
                    ok: true,
                    reason: 'image_moderation_disabled',
                    score: { note: 'Image moderation is disabled' }
                });
            }

            // Check if we have base64 data (new approach) or fileId (legacy approach)
            if ('fileData' in body) {
                const res = await moderateImageAIFromBase64(body.fileData, body.fileName, body.fileType);
                return NextResponse.json({
                    ok: !res.blocked,
                    reason: res.reason,
                    score: res.score,
                });
            } else {
                const res = await moderateImageAI(body.fileId, body.bucketId);
                return NextResponse.json({
                    ok: !res.blocked,
                    reason: res.reason,
                    score: res.score,
                });
            }
        }

        return NextResponse.json({ ok: false, error: 'Unsupported type' }, { status: 400 });
    } catch (e: unknown) {
        const error = e as Error;
        return NextResponse.json({ ok: false, error: error?.message || 'Moderation failed' }, { status: 500 });
    }
}

// Test API key directly
async function testAPIKey() {
    const apiKey = process.env.OPENMODERATOR_API_KEY;
    if (!apiKey) return { error: 'No API key found' };

    try {
        // Test with a simple text moderation first
        const filter = new Filter({ openModeratorAPIKey: apiKey });
        const result = await filter.isProfaneAI('test message');
        return { success: true, result };
    } catch (error) {
        const err = error as Error;
        return {
            error: 'API test failed',
            message: err.message,
            name: err.name
        };
    }
}

// GET endpoint for testing and debugging
export async function GET() {
    const hasServerToken = !!process.env.OPENMODERATOR_API_KEY;
    const hasClientToken = !!process.env.NEXT_PUBLIC_OPENMODERATOR_API_KEY;
    const imageModDisabled = process.env.DISABLE_IMAGE_MODERATION === 'true';
    const useAI = process.env.USE_OPENMODERATOR_MODERATION === 'true';

    // Test the API key if it exists
    const apiTest = hasServerToken ? await testAPIKey() : null;

    return NextResponse.json({
        status: 'ok',
        hasServerToken: hasServerToken,
        hasClientToken: hasClientToken,
        aiModerationEnabled: useAI,
        imageModerationDisabled: imageModDisabled,
        serverKeyLength: process.env.OPENMODERATOR_API_KEY?.length || 0,
        clientKeyLength: process.env.NEXT_PUBLIC_OPENMODERATOR_API_KEY?.length || 0,
        apiTest: apiTest,
        message: hasServerToken && hasClientToken && useAI
            ? 'Moderation API is fully configured with content-checker (OpenModerator)'
            : hasServerToken && hasClientToken
                ? 'API keys set but USE_OPENMODERATOR_MODERATION is false'
                : hasServerToken
                    ? 'Server key set but client key (NEXT_PUBLIC_OPENMODERATOR_API_KEY) missing - use SAME key value'
                    : hasClientToken
                        ? 'Client key set but server key (OPENMODERATOR_API_KEY) missing - use SAME key value'
                        : 'No API keys set - using fallback moderation only',
        timestamp: new Date().toISOString()
    });
}


