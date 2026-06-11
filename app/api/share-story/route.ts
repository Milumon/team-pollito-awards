import { ImageResponse } from 'next/og';
import { createElement } from 'react';
import { StoryImage } from './story-image';

export const runtime = 'nodejs';

type StoryHighlight = {
  category: string;
  nominee: string;
  emoji: string;
  avatarUrl?: string | null;
};

type StoryPayload = {
  displayName?: string;
  username?: string | null;
  avatarUrl?: string | null;
  voteCount?: number;
  totalCategories?: number;
  mvpName?: string;
  mvpAvatarUrl?: string | null;
  highlights?: StoryHighlight[];
};

const WIDTH = 1080;
const HEIGHT = 1920;

function normalizeString(value: string | null | undefined, fallback: string) {
  return value?.trim() || fallback;
}

async function fetchImageAsDataUrl(imageUrl: string | null | undefined) {
  if (!imageUrl) return null;
  if (imageUrl.startsWith('data:')) return imageUrl;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);

    const response = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) return null;

    const contentType = response.headers.get('content-type') || 'image/png';
    const buffer = await response.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    let binary = '';

    for (let index = 0; index < bytes.length; index += 0x8000) {
      binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000));
    }

    return `data:${contentType};base64,${btoa(binary)}`;
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as StoryPayload;
    const displayName = normalizeString(body.displayName, 'Pollito verificado');
    const username = body.username?.trim() ? `@${body.username.trim()}` : null;
    const avatarUrl = await fetchImageAsDataUrl(body.avatarUrl || null);
    const voteCount = Number(body.voteCount || 0);
    const totalCategories = Number(body.totalCategories || 0);
    const mvpName = normalizeString(body.mvpName, 'Tu selección principal');
    const mvpAvatarUrl = await fetchImageAsDataUrl(body.mvpAvatarUrl || null);
    const highlights = Array.isArray(body.highlights)
      ? await Promise.all(
          body.highlights.slice(0, 3).map(async (highlight) => ({
            ...highlight,
            avatarUrl: await fetchImageAsDataUrl(highlight.avatarUrl || null),
          }))
        )
      : [];

    return new ImageResponse(
      createElement(StoryImage, {
        displayName,
        username,
        avatarUrl,
        voteCount,
        totalCategories,
        mvpName,
        mvpAvatarUrl,
        highlights,
      }),
      {
        width: WIDTH,
        height: HEIGHT,
      }
    );
  } catch (error) {
    console.error('Failed to generate story image:', error);
    return new Response('Failed to generate image', { status: 500 });
  }
}
