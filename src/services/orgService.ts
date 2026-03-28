import { supabase } from '../lib/supabase'
import type { Organization, OrgMember, OrgRole } from '../types'

// ============================================================
// 조직 조회/수정
// ============================================================

export async function getOrganization(orgId: string): Promise<Organization | null> {
  const { data, error } = await supabase
    .from('organizations')
    .select('*')
    .eq('id', orgId)
    .single()
  if (error) throw error
  if (!data) return null
  return {
    id: data.id,
    bizRegistrationNo: data.biz_registration_no ?? '',
    bizName: data.biz_name ?? '',
    bizCeo: data.biz_ceo ?? '',
    bizAddress: data.biz_address ?? '',
    bizPhone: data.biz_phone ?? '',
    bizMobile: data.biz_mobile ?? '',
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  }
}

export async function updateOrganization(
  orgId: string,
  data: Partial<Pick<Organization, 'bizRegistrationNo' | 'bizName' | 'bizCeo' | 'bizAddress' | 'bizPhone' | 'bizMobile'>>,
): Promise<void> {
  const updates: Record<string, unknown> = {}
  if (data.bizRegistrationNo !== undefined) updates.biz_registration_no = data.bizRegistrationNo
  if (data.bizName !== undefined) updates.biz_name = data.bizName
  if (data.bizCeo !== undefined) updates.biz_ceo = data.bizCeo
  if (data.bizAddress !== undefined) updates.biz_address = data.bizAddress
  if (data.bizPhone !== undefined) updates.biz_phone = data.bizPhone
  if (data.bizMobile !== undefined) updates.biz_mobile = data.bizMobile
  const { error } = await supabase.from('organizations').update(updates).eq('id', orgId)
  if (error) throw error
}

// ============================================================
// 멤버 관리
// ============================================================

export async function listOrgMembers(orgId: string): Promise<OrgMember[]> {
  const { data, error } = await supabase
    .from('org_members')
    .select('id, org_id, user_id, role, joined_at, profiles(display_name, manager_name)')
    .eq('org_id', orgId)
    .order('joined_at')
  if (error) throw error
  return (data ?? []).map((row: any) => ({
    id: row.id,
    orgId: row.org_id,
    userId: row.user_id,
    role: row.role as OrgRole,
    displayName: row.profiles?.display_name ?? '',
    managerName: row.profiles?.manager_name ?? '',
    joinedAt: row.joined_at,
  }))
}

export async function updateMemberRole(
  orgId: string,
  userId: string,
  role: OrgRole,
): Promise<void> {
  const { error } = await supabase
    .from('org_members')
    .update({ role })
    .eq('org_id', orgId)
    .eq('user_id', userId)
  if (error) throw error
}

export async function removeMember(orgId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('org_members')
    .delete()
    .eq('org_id', orgId)
    .eq('user_id', userId)
  if (error) throw error
}

// ============================================================
// 초대
// ============================================================

export async function inviteMember(
  orgId: string,
  email: string,
  role: OrgRole,
  invitedBy: string,
): Promise<string> {
  // 기존 초대(accepted/expired) 삭제 후 재생성
  await supabase
    .from('org_invites')
    .delete()
    .eq('org_id', orgId)
    .eq('email', email)

  const { data, error } = await supabase
    .from('org_invites')
    .insert({ org_id: orgId, email, role, invited_by: invitedBy })
    .select('token')
    .single()
  if (error) throw error
  return data.token as string
}

export async function listInvites(orgId: string) {
  const { data, error } = await supabase
    .from('org_invites')
    .select('*')
    .eq('org_id', orgId)
    .in('status', ['pending', 'accepted'])
    .order('created_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function cancelInvite(inviteId: string): Promise<void> {
  const { error } = await supabase
    .from('org_invites')
    .update({ status: 'expired' })
    .eq('id', inviteId)
  if (error) throw error
}
