import { NextRequest, NextResponse } from 'next/server';

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

// Text moderation: Hugging Face only

type Body =
    | { type: 'text'; content: string }
    | { type: 'image'; url: string };

type HFResponse = Array<{ label: string; score: number }> | { [key: string]: unknown };

async function hfRequest(model: string, payload: Record<string, unknown>) {
    const token = process.env.HUGGINGFACE_API_TOKEN;
    if (!token) throw new Error('HUGGINGFACE_API_TOKEN not set');
    const timeoutMs = Number(process.env.HUGGINGFACE_TIMEOUT_MS || 7000);
    const retries = Math.max(0, Number(process.env.HUGGINGFACE_RETRIES || 2));

    for (let attempt = 0; attempt <= retries; attempt++) {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), timeoutMs);
        try {
            const res = await fetch(`https://api-inference.huggingface.co/models/${model}`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
                signal: ctrl.signal,
            });
            clearTimeout(timer);
            if (!res.ok) throw new Error(`HF error ${res.status}`);
            return (await res.json()) as HFResponse;
        } catch (err) {
            clearTimeout(timer);
            if (attempt === retries) throw err;
            await new Promise((r) => setTimeout(r, 300 * (attempt + 1)));
        }
    }
    throw new Error('HF request failed');
}

async function moderateTextHF(text: string) {
    const data = await hfRequest('unitary/unbiased-toxic-roberta', { inputs: text });
    const items = Array.isArray(data) ? (Array.isArray(data[0]) ? data[0] : data) : [] as any;
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

// Image moderation via HF NSFW detector
async function moderateImageHF(url: string) {
    const data = await hfRequest('Falconsai/nsfw_image_detection', { inputs: url });
    const items = Array.isArray(data) ? data : (data as any)?.[0] || [];
    let nsfw = 0;
    if (Array.isArray(items)) {
        for (const it of items as any[]) {
            const label = (it.label || it?.[0])?.toString().toLowerCase();
            const score = Number(it.score || it?.[1] || 0);
            if (label?.includes('nsfw') || label?.includes('porn')) nsfw = Math.max(nsfw, score);
        }
    }
    const blocked = nsfw >= 0.8;
    return { blocked, score: { nsfw } };
}

async function moderateImage(url: string) {
    try {
        const ai = await moderateImageHF(url);
        return {
            blocked: ai.blocked,
            reason: ai.blocked ? 'ai_moderation' : 'passed',
            score: ai.score,
        };
    } catch (error) {
        const failClosed = process.env.IMAGE_MODERATION_FAIL_CLOSED === 'true';
        return failClosed
            ? { blocked: true, reason: 'ai_failed', score: { error: 'image_ai_failed' } }
            : { blocked: false, reason: 'ai_failed', score: { error: 'image_ai_failed' } };
    }
}

async function moderateText(text: string) {
    try {
        const aiCheck = await moderateTextHF(text);
        return {
            blocked: aiCheck.blocked,
            reason: aiCheck.blocked ? 'ai_moderation' : 'passed',
            score: aiCheck.score
        };
    } catch (error) {
        // Fail closed if HF is not available
        return { blocked: true, reason: 'ai_failed', score: { error: 'text_ai_failed' } };
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


