import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { isAuthorized } from '@/lib/adminAuth';
import { logAdminAction } from '@/lib/auditLogger';

// POST /api/admin/sounds/submissions/[id]/reject
// Rechaza un envío con motivo opcional
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!await isAuthorized(request)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const authHeader = request.headers.get('Authorization');
  let adminEmail = 'admin-token@system';
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.substring('Bearer '.length);
    const { data: { user } } = await supabaseAdmin.auth.getUser(token);
    if (user?.email) adminEmail = user.email;
  }

  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const reason = (body.reason as string | undefined)?.trim() || null;

    const { data: submission, error: fetchError } = await supabaseAdmin
      .from('sound_submissions')
      .select('id, status, name, submitted_by_user_id')
      .eq('id', id)
      .maybeSingle();

    if (fetchError) throw fetchError;
    if (!submission) {
      return NextResponse.json({ error: 'Envío no encontrado' }, { status: 404 });
    }
    if (submission.status !== 'pending') {
      return NextResponse.json(
        { error: `Este envío ya fue ${submission.status === 'approved' ? 'aprobado' : 'rechazado'}.` },
        { status: 409 }
      );
    }

    const { error: updateError } = await supabaseAdmin
      .from('sound_submissions')
      .update({
        status: 'rejected',
        rejection_reason: reason,
        reviewed_by: adminEmail,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (updateError) throw updateError;

    await logAdminAction(adminEmail, 'Envío de audio rechazado', {
      submission_id: id,
      name: submission.name,
      submitted_by: submission.submitted_by_user_id,
      reason,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Submission Reject Error]:', error);
    const msg = error instanceof Error ? error.message : 'Error desconocido';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
