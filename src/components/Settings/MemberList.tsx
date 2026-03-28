import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import type { OrgMember, OrgRole } from '../../types'
import { listOrgMembers, updateMemberRole, removeMember, listInvites, cancelInvite } from '../../services/orgService'
import InviteModal from './InviteModal'

const ROLE_LABELS: Record<OrgRole, string> = {
  owner: '소유자',
  manager: '관리자',
  viewer: '열람자',
}

export default function MemberList() {
  const { user, organization, orgRole, isSuper } = useAuth()
  const [members, setMembers] = useState<OrgMember[]>([])
  const [invites, setInvites] = useState<any[]>([])
  const [showInvite, setShowInvite] = useState(false)
  const [loading, setLoading] = useState(true)

  const isOwner = isSuper || orgRole === 'owner'

  const loadData = useCallback(async () => {
    if (!organization) return
    setLoading(true)
    try {
      const [m, inv] = await Promise.all([
        listOrgMembers(organization.id),
        isOwner ? listInvites(organization.id) : Promise.resolve([]),
      ])
      setMembers(m)
      setInvites(inv)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [organization, isOwner])

  useEffect(() => { loadData() }, [loadData])

  const handleRoleChange = async (userId: string, role: OrgRole) => {
    if (!organization) return
    await updateMemberRole(organization.id, userId, role)
    loadData()
  }

  const handleRemove = async (member: OrgMember) => {
    if (!organization) return
    if (!confirm(`"${member.managerName || member.displayName}"님을 조직에서 제거하시겠습니까?`)) return
    await removeMember(organization.id, member.userId)
    loadData()
  }

  const handleCancelInvite = async (inviteId: string) => {
    if (!confirm('초대를 취소하시겠습니까?')) return
    await cancelInvite(inviteId)
    loadData()
  }

  if (loading) return <div className="settings-page"><p>불러오는 중...</p></div>

  return (
    <div className="settings-page">
      <div className="member-header">
        <h2>직원 관리</h2>
        {isOwner && (
          <button className="btn-primary" onClick={() => setShowInvite(true)}>
            + 직원 초대
          </button>
        )}
      </div>

      <table className="member-table">
        <thead>
          <tr>
            <th>이름</th>
            <th>역할</th>
            <th>가입일</th>
            {isOwner && <th>관리</th>}
          </tr>
        </thead>
        <tbody>
          {members.map((m) => (
            <tr key={m.id}>
              <td>
                <span className="member-name">{m.managerName || m.displayName}</span>
                {m.userId === user?.id && <span className="member-me">나</span>}
              </td>
              <td>
                {isOwner && m.role !== 'owner' ? (
                  <select
                    value={m.role}
                    onChange={(e) => handleRoleChange(m.userId, e.target.value as OrgRole)}
                  >
                    <option value="manager">관리자</option>
                    <option value="viewer">열람자</option>
                  </select>
                ) : (
                  <span className={`role-badge role-${m.role}`}>{ROLE_LABELS[m.role]}</span>
                )}
              </td>
              <td className="member-date">{new Date(m.joinedAt).toLocaleDateString()}</td>
              {isOwner && (
                <td>
                  {m.role !== 'owner' && (
                    <button className="btn-tiny btn-danger" onClick={() => handleRemove(m)}>
                      제거
                    </button>
                  )}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>

      {isOwner && invites.length > 0 && (
        <>
          <h3 className="invite-section-title">초대 현황</h3>
          <table className="member-table">
            <thead>
              <tr>
                <th>이메일</th>
                <th>역할</th>
                <th>상태</th>
                <th>초대일</th>
                <th>관리</th>
              </tr>
            </thead>
            <tbody>
              {invites.map((inv) => (
                <tr key={inv.id}>
                  <td>{inv.email}</td>
                  <td><span className={`role-badge role-${inv.role}`}>{ROLE_LABELS[inv.role as OrgRole]}</span></td>
                  <td>
                    <span className={`invite-status invite-status-${inv.status}`}>
                      {inv.status === 'pending' ? '대기중' : '가입완료'}
                    </span>
                  </td>
                  <td className="member-date">{new Date(inv.created_at).toLocaleDateString()}</td>
                  <td>
                    {inv.status === 'pending' && (
                      <button className="btn-tiny btn-danger" onClick={() => handleCancelInvite(inv.id)}>
                        취소
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {showInvite && organization && (
        <InviteModal
          orgId={organization.id}
          invitedBy={user?.id || ''}
          onClose={() => setShowInvite(false)}
          onInvited={() => {
            setShowInvite(false)
            loadData()
          }}
        />
      )}
    </div>
  )
}
