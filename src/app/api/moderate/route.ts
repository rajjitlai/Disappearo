import { NextRequest, NextResponse } from 'next/server';
import { Filter } from 'content-checker';

// Simple in-memory rate limiter per IP
const RATE_LIMIT_WINDOW_MS = 60_000; // 1m
const RATE_LIMIT_MAX = 60; // 60 requests/min
const bucket = new Map<string, { count: number; reset: number }>();

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
    | { type: 'text'; content: string };

// Initialize content-checker filter
function getContentFilter() {
    const apiKey = process.env.OPENMODERATOR_API_KEY || process.env.NEXT_PUBLIC_OPENMODERATOR_API_KEY;
    if (!apiKey) {
        console.warn('OPENMODERATOR_API_KEY not set, using fallback moderation only');
        return new Filter();
    }
    return new Filter({ openModeratorAPIKey: apiKey });
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

// Image moderation removed for now

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
        // Image moderation disabled
        return NextResponse.json({ ok: false, error: 'Unsupported type' }, { status: 400 });
    } catch (e: unknown) {
        const error = e as Error;
        return NextResponse.json({ ok: false, error: error?.message || 'Moderation failed' }, { status: 500 });
    }
}

// GET endpoint for testing and debugging
export async function GET() {
    const hasToken = !!process.env.OPENMODERATOR_API_KEY;
    const imageModDisabled = process.env.DISABLE_IMAGE_MODERATION === 'true';
    const useAI = process.env.USE_OPENMODERATOR_MODERATION === 'true';

    return NextResponse.json({
        status: 'ok',
        hasOpenModeratorToken: hasToken,
        aiModerationEnabled: useAI,
        imageModerationDisabled: imageModDisabled,
        message: hasToken && useAI
            ? 'Moderation API is configured with content-checker (OpenModerator)'
            : hasToken
                ? 'OPENMODERATOR_API_KEY set but USE_OPENMODERATOR_MODERATION is false'
                : 'OPENMODERATOR_API_KEY not set - using fallback moderation only',
        timestamp: new Date().toISOString()
    });
}


