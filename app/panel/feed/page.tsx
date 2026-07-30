import { requireMemberAccess } from '@/lib/memberPanelAuth';

export default async function MemberPanelFeedPage() {
  await requireMemberAccess('/panel/feed');

  return null;
}
