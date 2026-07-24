import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const TIKTOK_CDN = 'https://p16-sign-sg.tiktokcdn.com/obj/';

export async function GET(request: NextRequest) {
  const uri = request.nextUrl.searchParams.get('uri');
  if (!uri || uri.length > 512) {
    return NextResponse.json({ error: 'Missing or invalid uri param' }, { status: 400 });
  }

  const targetUrl = uri.startsWith('http') ? uri : `${TIKTOK_CDN}${uri}`;

  try {
    const res = await fetch(targetUrl, {
      headers: {
        'Referer': 'https://www.tiktok.com/',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36',
      },
      next: { revalidate: 86400 },
    });

    if (!res.ok) {
      return NextResponse.json({ error: ' upstream error' }, { status: 502 });
    }

    const contentType = res.headers.get('content-type') || 'image/jpeg';
    const body = await res.arrayBuffer();

    return new NextResponse(body, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=604800, stale-while-revalidate=86400',
      },
    });
  } catch {
    return NextResponse.json({ error: 'Failed to fetch avatar' }, { status: 502 });
  }
}
