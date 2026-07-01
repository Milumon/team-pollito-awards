import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { isAuthorized } from '@/lib/adminAuth';
import { logAdminAction } from '@/lib/auditLogger';

// DELETE: Eliminar un sonido (solo administradores)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!await isAuthorized(request)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const authHeader = request.headers.get('Authorization');
    let adminEmail = 'admin-token@system';
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring('Bearer '.length);
      const { data: { user } } = await supabaseAdmin.auth.getUser(token);
      if (user?.email) adminEmail = user.email;
    }

    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: 'Falta el parámetro id' }, { status: 400 });
    }

    // 1. Obtener la información del sonido para saber el file_path y el name
    const { data: sound, error: fetchError } = await supabaseAdmin
      .from('soundboard_sounds')
      .select('name, file_path')
      .eq('id', id)
      .maybeSingle();

    if (fetchError) throw fetchError;
    if (!sound) {
      return NextResponse.json({ error: 'Sonido no encontrado' }, { status: 404 });
    }

    // 2. Eliminar el archivo físico de Supabase Storage
    const { error: storageError } = await supabaseAdmin.storage
      .from('soundboard-files')
      .remove([sound.file_path]);

    if (storageError) {
      console.warn('[Storage Delete Warning]:', storageError.message);
      // Continuamos incluso si falla el storage, para no dejar huérfana la base de datos
    }

    // 3. Eliminar la fila de la base de datos
    const { error: dbError } = await supabaseAdmin
      .from('soundboard_sounds')
      .delete()
      .eq('id', id);

    if (dbError) throw dbError;

    // 4. Registrar log de auditoría
    await logAdminAction(adminEmail, 'Sonido eliminado', {
      sound_id: id,
      name: sound.name,
      file_path: sound.file_path,
    });

    return NextResponse.json({ success: true, message: 'Sonido eliminado correctamente' });
  } catch (error) {
    console.error('[Sounds DELETE Error]:', error);
    const errorMsg = error instanceof Error ? error.message : 'Error desconocido al eliminar el sonido';
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
