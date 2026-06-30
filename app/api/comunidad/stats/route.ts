import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// GET /api/comunidad/stats - Obtener estadísticas rápidas de la comunidad en Supabase
export async function GET() {
  try {
    const todayStr = new Date().toISOString().split('T')[0];
    
    // Primer día del mes actual en formato ISO
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    // 1. Total de Perfiles (usuarios registrados)
    const { count: totalProfiles, error: err1 } = await supabaseAdmin
      .from('profiles')
      .select('*', { count: 'exact', head: true });

    // 2. Miembros Oficiales
    const { count: officialMembers, error: err2 } = await supabaseAdmin
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('link_status', 'approved');

    // 3. Entrevistas Próximas (con estado pending y de hoy en adelante)
    const { count: pendingInterviews, error: err3 } = await supabaseAdmin
      .from('interview_history')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending')
      .gte('interview_date', todayStr);

    // 4. Eventos Este Mes (eventos en stream_events del mes corriente)
    const { count: eventsThisMonth, error: err4 } = await supabaseAdmin
      .from('stream_events')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', firstDayOfMonth);

    // 5. Nuevos perfiles esta semana
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const sevenDaysAgoStr = sevenDaysAgo.toISOString();

    const { count: newMembersThisWeek, error: err5 } = await supabaseAdmin
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', sevenDaysAgoStr);

    if (err1 || err2 || err3 || err4 || err5) {
      const errMsg = err1?.message || err2?.message || err3?.message || err4?.message || err5?.message || '';
      return NextResponse.json({ error: `Error en base de datos: ${errMsg}` }, { status: 500 });
    }

    return NextResponse.json({
      totalProfiles: totalProfiles || 0,
      officialMembers: officialMembers || 0,
      pendingInterviews: pendingInterviews || 0,
      eventsThisMonth: eventsThisMonth || 0,
      newMembersThisWeek: newMembersThisWeek || 0,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error desconocido';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
