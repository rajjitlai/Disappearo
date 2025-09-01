import { NextRequest, NextResponse } from 'next/server';

// Hugging Face only moderation (free tier friendly)
// Set HUGGINGFACE_API_TOKEN in your environment

type Body =
    | { type: 'text'; content: string }
    | { type: 'image'; url: string };

async function hfRequest(model: string, payload: any) {
    const token = process.env.HUGGINGFACE_API_TOKEN;
    if (!token) throw new Error('HUGGINGFACE_API_TOKEN not set');
    const res = await fetch(`https://api-inference.huggingface.co/models/${model}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`HF error ${res.status}`);
    return res.json();
}

async function moderateTextHF(text: string) {
    // Unitary toxicity model
    const data = await hfRequest('unitary/unbiased-toxic-roberta', { inputs: text });
    // data is array of labels with scores; find toxic score
    const items = Array.isArray(data) ? data[0] : data?.[0] || [];
    const find = (label: string) => {
        const it = items.find((x: any) => (x.label || '').toLowerCase().includes(label));
        return Number(it?.score ?? 0);
    };
    const toxicity = Math.max(find('toxic'), find('severe_toxic'), find('insult'));
    const hate = Math.max(find('identity_hate'), find('threat'));
    const blocked = toxicity >= 0.8 || hate >= 0.7;
    return { blocked, score: { toxicity, hate } };
}

async function moderateImageHF(url: string) {
    const data = await hfRequest('Falconsai/nsfw_image_detection', { inputs: url });
    const items = Array.isArray(data) ? data : (data?.[0] || []);
    let nsfw = 0;
    for (const it of items) {
        const label = (it.label || it?.[0])?.toString().toLowerCase();
        const score = Number(it.score || it?.[1] || 0);
        if (label?.includes('nsfw') || label?.includes('porn')) nsfw = Math.max(nsfw, score);
    }
    const blocked = nsfw >= 0.8;
    return { blocked, score: { nsfw } };
}

export async function POST(req: NextRequest) {
    try {
        const body = (await req.json()) as Body;
        if (body.type === 'text') {
            const res = await moderateTextHF(body.content);
            return NextResponse.json({ ok: !res.blocked, score: res.score });
        }
        if (body.type === 'image') {
            const res = await moderateImageHF(body.url);
            return NextResponse.json({ ok: !res.blocked, score: res.score });
        }
        return NextResponse.json({ ok: false, error: 'Unsupported type' }, { status: 400 });
    } catch (e: any) {
        return NextResponse.json({ ok: false, error: e?.message || 'Moderation failed' }, { status: 500 });
    }
}


