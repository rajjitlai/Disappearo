import { NextRequest, NextResponse } from 'next/server';
import { databases, ids } from '@/app/lib/appwrite';
import { Query } from 'appwrite';

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

// Interface for bad words document
interface BadWordDocument {
    word: string;
    category: string;
    createdAt: string;
}

// Custom bad words filtering
async function checkCustomBadWords(text: string): Promise<{ blocked: boolean; foundWords: string[] }> {
    try {
        const result = await databases.listDocuments(ids.db, ids.bad_words, [
            Query.limit(100),
        ]);

        const badWords = result.documents.map((doc) => (doc as unknown as BadWordDocument).word.toLowerCase());
        const textLower = text.toLowerCase();
        const foundWords: string[] = [];

        for (const word of badWords) {
            if (textLower.includes(word)) {
                foundWords.push(word);
            }
        }

        return {
            blocked: foundWords.length > 0,
            foundWords
        };
    } catch {
        return { blocked: false, foundWords: [] };
    }
}

// Hugging Face only moderation (free tier friendly)
// Set HUGGINGFACE_API_TOKEN in your environment

type Body =
    | { type: 'text'; content: string }
    | { type: 'image'; url: string };

type HFResponse = Array<{ label: string; score: number }> | { [key: string]: unknown };

async function hfRequest(model: string, payload: Record<string, unknown>) {
    const token = process.env.HUGGINGFACE_API_TOKEN;
    if (!token) throw new Error('HUGGINGFACE_API_TOKEN not set');
    const res = await fetch(`https://api-inference.huggingface.co/models/${model}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`HF error ${res.status}`);
    return res.json() as Promise<HFResponse>;
}

async function moderateTextHF(text: string) {
    // Unitary toxicity model
    const data = await hfRequest('unitary/unbiased-toxic-roberta', { inputs: text });
    // data is array of labels with scores; find toxic score
    const items = Array.isArray(data) ? data[0] : Array.isArray(data?.[0]) ? data[0] : [];
    const find = (label: string) => {
        if (!Array.isArray(items)) return 0;
        const it = items.find((x: { label?: string; score?: number }) => (x.label || '').toLowerCase().includes(label));
        return Number(it?.score ?? 0);
    };
    const toxicity = Math.max(find('toxic'), find('severe_toxic'), find('insult'));
    const hate = Math.max(find('identity_hate'), find('threat'));
    const blocked = toxicity >= 0.8 || hate >= 0.7;
    return { blocked, score: { toxicity, hate } };
}

async function moderateImageHF(url: string) {
    try {
        const data = await hfRequest('Falconsai/nsfw_image_detection', { inputs: url });
        const items = Array.isArray(data) ? data : (data?.[0] || []);
        let nsfw = 0;
        if (Array.isArray(items)) {
            for (const it of items) {
                const label = (it.label || it?.[0])?.toString().toLowerCase();
                const score = Number(it.score || it?.[1] || 0);
                if (label?.includes('nsfw') || label?.includes('porn')) nsfw = Math.max(nsfw, score);
            }
        }
        const blocked = nsfw >= 0.8;
        return { blocked, score: { nsfw } };
    } catch (error) {
        // If image moderation fails, allow the image (fail open for safety)
        console.warn('Image moderation failed, allowing image:', error);
        return { blocked: false, score: { nsfw: 0, error: 'moderation_failed' } };
    }
}

// Enhanced image moderation with comprehensive fallback
async function moderateImage(url: string) {
    // Check if image moderation is disabled via environment variable
    if (process.env.DISABLE_IMAGE_MODERATION === 'true') {
        console.log('Image moderation disabled via environment variable');
        return {
            blocked: false,
            reason: 'disabled',
            score: { disabled: true }
        };
    }

    try {
        const aiCheck = await moderateImageHF(url);
        return {
            blocked: aiCheck.blocked,
            reason: aiCheck.blocked ? 'ai_moderation' : 'passed',
            score: aiCheck.score
        };
    } catch (error) {
        // If AI moderation fails completely, allow the image
        console.warn('Image moderation completely failed, allowing image:', error);
        return {
            blocked: false,
            reason: 'ai_failed',
            score: { error: 'complete_failure' }
        };
    }
}

// Enhanced text moderation combining custom bad words and AI
async function moderateText(text: string) {
    // First check custom bad words
    const customCheck = await checkCustomBadWords(text);
    if (customCheck.blocked) {
        return {
            blocked: true,
            reason: 'custom_bad_words',
            foundWords: customCheck.foundWords,
            score: { custom: 1.0 }
        };
    }

    // Then check with AI moderation
    try {
        const aiCheck = await moderateTextHF(text);
        return {
            blocked: aiCheck.blocked,
            reason: aiCheck.blocked ? 'ai_moderation' : 'passed',
            score: aiCheck.score
        };
    } catch (error) {
        // If AI moderation fails, fall back to custom words only
        console.warn('AI moderation failed, using custom words only:', error);
        return {
            blocked: false,
            reason: 'ai_failed',
            score: { custom: 0.0 }
        };
    }
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
                foundWords: res.foundWords || []
            });
        }
        if (body.type === 'image') {
            const res = await moderateImage(body.url);
            return NextResponse.json({
                ok: !res.blocked,
                reason: res.reason,
                score: res.score
            });
        }
        return NextResponse.json({ ok: false, error: 'Unsupported type' }, { status: 400 });
    } catch (e: unknown) {
        const error = e as Error;
        return NextResponse.json({ ok: false, error: error?.message || 'Moderation failed' }, { status: 500 });
    }
}

// GET endpoint for testing and debugging
export async function GET() {
    const hasToken = !!process.env.HUGGINGFACE_API_TOKEN;
    const imageModDisabled = process.env.DISABLE_IMAGE_MODERATION === 'true';

    return NextResponse.json({
        status: 'ok',
        hasHuggingFaceToken: hasToken,
        imageModerationDisabled: imageModDisabled,
        message: hasToken
            ? 'Moderation API is configured'
            : 'HUGGINGFACE_API_TOKEN not set - moderation will fail open',
        timestamp: new Date().toISOString()
    });
}


