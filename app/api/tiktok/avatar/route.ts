import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const TIKTOK_CDN = 'https://p16-sign-sg.tiktokcdn.com/obj/';
const ALLOWED_HOSTS = ['.tiktokcdn.com', '.tiktokcdn-us.com', '.byteoversea.com'];

function resolveAvatarUrl(uri: string): URL | null {
  try {
    const url = new URL(uri.startsWith('https://') ? uri : `${TIKTOK_CDN}${uri}`);
    if (url.protocol !== 'https:' || !ALLOWED_HOSTS.some((suffix) => url.hostname.endsWith(suffix))) return null;
    return url;
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  const uri = request.nextUrl.searchParams.get('uri');
  if (!uri || uri.length > 4096) {
    return NextResponse.json({ error: 'Missing or invalid uri param' }, { status: 400 });
  }

  const targetUrl = resolveAvatarUrl(uri);
  if (!targetUrl) {
    return NextResponse.json({ error: 'Unsupported avatar URL' }, { status: 400 });
  }

  try {
    const res = await fetch(targetUrl, {
      headers: {
        'Referer': 'https://www.tiktok.com/',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36',
      },
      next: { revalidate: 86400 },
    });

    if (!res.ok) {
      return NextResponse.json({ error: 'TikTok avatar upstream error' }, { status: 502 });
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
