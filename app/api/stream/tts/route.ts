import { NextRequest, NextResponse } from 'next/server';
import { generateTtsAudio } from '@/lib/googleTts';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const text = searchParams.get('text');

    if (!text || !text.trim()) {
      return NextResponse.json({ error: 'El parámetro "text" es obligatorio' }, { status: 400 });
    }

    if (text.length > 120) {
      return NextResponse.json({ error: 'El texto no puede superar los 120 caracteres' }, { status: 400 });
    }

    const audioBuffer = await generateTtsAudio(text);

    return new Response(new Uint8Array(audioBuffer), {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error) {
    console.error('[TTS Route Error]:', error);
    const errorMsg = error instanceof Error ? error.message : 'Error al procesar la solicitud de TTS';
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
