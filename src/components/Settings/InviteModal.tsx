import { useState } from 'react'
import type { FormEvent } from 'react'
import type { OrgRole } from '../../types'
import { inviteMember } from '../../services/orgService'

type Props = {
  orgId: string
  invitedBy: string
  onClose: () => void
  onInvited: () => void
}

export default function InviteModal({ orgId, invitedBy, onClose, onInvited }: Props) {
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<OrgRole>('viewer')
  const [inviteLink, setInviteLink] = useState('')
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setCopied(false)

    try {
      const token = await inviteMember(orgId, email, role, invitedBy)
      const link = `${window.location.origin}/invite?token=${token}`
      setInviteLink(link)
    } catch (err) {
      setError(err instanceof Error ? err.message : '초대 생성에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = async () => {
    await navigator.clipboard.writeText(inviteLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-invite" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>직원 초대</h2>
          <button className="btn-close-modal" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          {!inviteLink ? (
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>이메일</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="초대할 직원 이메일"
                  required
                />
              </div>
              <div className="form-group">
                <label>역할</label>
                <select value={role} onChange={(e) => setRole(e.target.value as OrgRole)}>
                  <option value="manager">관리자 - 현장 등록/수정 가능</option>
                  <option value="viewer">열람자 - 조회만 가능</option>
                </select>
              </div>

              {error && <div className="login-error">{error}</div>}

              <button type="submit" className="btn-submit" disabled={loading}>
                {loading ? '생성 중...' : '초대 링크 생성'}
              </button>
            </form>
          ) : (
            <div className="invite-result">
              <p className="invite-result-desc">
                아래 링크를 복사하여 <strong>{email}</strong>에게 전달해주세요.
              </p>
              <div className="invite-link-box">
                <input type="text" value={inviteLink} readOnly />
                <button className="btn-primary" onClick={handleCopy}>
                  {copied ? '복사됨!' : '복사'}
                </button>
              </div>
              <div className="invite-result-actions">
                <button className="btn-cancel" onClick={onClose}>닫기</button>
                <button className="btn-submit" onClick={onInvited}>완료</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
