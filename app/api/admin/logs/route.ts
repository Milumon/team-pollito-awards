import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { isAuthorized } from '@/lib/adminAuth';

export async function GET(request: NextRequest) {
  try {
    if (!await isAuthorized(request)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { data: logs, error } = await supabaseAdmin
      .from('admin_audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      throw error;
    }

    return NextResponse.json({ logs });
  } catch (error) {
    console.error('[Admin Logs GET Error]:', error);
    const errorMsg = error instanceof Error ? error.message : 'Error al obtener los logs de auditoría';
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
