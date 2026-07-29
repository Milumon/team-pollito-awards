import { requireMemberAccess } from '@/lib/memberPanelAuth';

export default async function MemberPanelHomePage() {
  await requireMemberAccess('/panel/inicio');

  return null;
}
