import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { isAuthorized } from '@/lib/adminAuth';
import { logAdminAction } from '@/lib/auditLogger';

// POST /api/admin/media/submissions/[id]/reject
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
    const reason = body.reason || null;

    const { data: submission, error: fetchError } = await supabaseAdmin
      .from('media_submissions')
      .select('id, status, name, media_type')
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
      .from('media_submissions')
      .update({
        status: 'rejected',
        rejection_reason: reason,
        reviewed_by: adminEmail,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (updateError) throw updateError;

    await logAdminAction(adminEmail, 'Media rechazada', {
      submission_id: id,
      name: submission.name,
      media_type: submission.media_type,
      reason,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Media Submission Reject Error]:', error);
    const msg = error instanceof Error ? error.message : 'Error desconocido';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
