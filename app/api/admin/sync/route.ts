import { NextRequest, NextResponse } from 'next/server';
import { isAuthorized } from '@/lib/adminAuth';

function getVmConfig() {
  const vmBaseUrl = process.env.ROBLOX_ALEXA_VM_URL || '';
  const vmSecret = process.env.ROBLOX_ALEXA_SHARED_SECRET || '';

  if (!vmBaseUrl || !vmSecret) {
    throw new Error('Faltan ROBLOX_ALEXA_VM_URL o ROBLOX_ALEXA_SHARED_SECRET');
  }

  return { vmBaseUrl, vmSecret };
}

export async function POST(request: NextRequest) {
  try {
    if (!await isAuthorized(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { vmBaseUrl, vmSecret } = getVmConfig();
    const response = await fetch(`${vmBaseUrl.replace(/\/$/, '')}/jobs/sync-nominees`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-shared-secret': vmSecret,
      },
      body: JSON.stringify({}),
    });

    const payload = await response.text();

    if (!response.ok) {
      return NextResponse.json({ error: payload || 'No se pudo iniciar la sincronización' }, { status: response.status });
    }

    try {
      return NextResponse.json(JSON.parse(payload), { status: response.status });
    } catch {
      return NextResponse.json({ error: 'Respuesta inválida de la VM' }, { status: 502 });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown sync error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    if (!await isAuthorized(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const jobId = request.nextUrl.searchParams.get('jobId');
    if (!jobId) {
      return NextResponse.json({ error: 'Falta jobId' }, { status: 400 });
    }

    const { vmBaseUrl, vmSecret } = getVmConfig();
    const response = await fetch(`${vmBaseUrl.replace(/\/$/, '')}/jobs/${jobId}/status`, {
      headers: {
        'x-shared-secret': vmSecret,
      },
    });

    const payload = await response.text();

    if (!response.ok) {
      return NextResponse.json({ error: payload || 'No se pudo obtener el estado' }, { status: response.status });
    }

    try {
      return NextResponse.json(JSON.parse(payload), { status: response.status });
    } catch {
      return NextResponse.json({ error: 'Respuesta inválida de la VM' }, { status: 502 });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown sync status error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}