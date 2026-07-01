import { supabaseAdmin } from './supabaseAdmin';

export async function logAdminAction(
  adminEmail: string,
  action: string,
  details: Record<string, unknown> = {}
): Promise<boolean> {
  try {
    const { error } = await supabaseAdmin
      .from('admin_audit_logs')
      .insert({
        admin_email: adminEmail,
        action: action,
        details: details
      });

    if (error) {
      console.error('[logAdminAction Error]: Failed to insert audit log:', error);
      return false;
    }

    return true;
  } catch (err) {
    console.error('[logAdminAction Exception]:', err);
    return false;
  }
}
