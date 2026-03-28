import { useState, useEffect } from 'react'
import type { FormEvent } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { updateOrganization } from '../../services/orgService'
import { formatBizNo, formatPhone } from '../../utils/format'

export default function ProfileSettings() {
  const { organization, orgRole, isSuper } = useAuth()
  const isOwner = isSuper || orgRole === 'owner'

  const [bizRegistrationNo, setBizRegistrationNo] = useState('')
  const [bizName, setBizName] = useState('')
  const [bizCeo, setBizCeo] = useState('')
  const [bizAddress, setBizAddress] = useState('')
  const [bizPhone, setBizPhone] = useState('')
  const [bizMobile, setBizMobile] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (organization) {
      setBizRegistrationNo(organization.bizRegistrationNo || '')
      setBizName(organization.bizName || '')
      setBizCeo(organization.bizCeo || '')
      setBizAddress(organization.bizAddress || '')
      setBizPhone(organization.bizPhone || '')
      setBizMobile(organization.bizMobile || '')
    }
  }, [organization])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setMessage('')
    setError('')

    try {
      if (organization) {
        await updateOrganization(organization.id, {
          bizRegistrationNo,
          bizName,
          bizCeo,
          bizAddress,
          bizPhone,
          bizMobile,
        })
      }
      setMessage('저장되었습니다.')
    } catch (err) {
      setError(err instanceof Error ? err.message : '저장에 실패했습니다.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="settings-page">
      <h2>회사 정보</h2>
      <form className="profile-settings-form" onSubmit={handleSubmit}>
        <div className="form-group">
          <label>사업자등록번호</label>
          <input
            type="text"
            value={bizRegistrationNo}
            onChange={(e) => setBizRegistrationNo(formatBizNo(e.target.value))}
            maxLength={12}
            disabled={!isOwner}
            required
          />
        </div>

        <div className="form-group">
          <label>상호</label>
          <input
            type="text"
            value={bizName}
            onChange={(e) => setBizName(e.target.value)}
            disabled={!isOwner}
            required
          />
        </div>

        <div className="form-group">
          <label>대표</label>
          <input
            type="text"
            value={bizCeo}
            onChange={(e) => setBizCeo(e.target.value)}
            disabled={!isOwner}
            required
          />
        </div>

        <div className="form-group">
          <label>주소</label>
          <input
            type="text"
            value={bizAddress}
            onChange={(e) => setBizAddress(e.target.value)}
            disabled={!isOwner}
            required
          />
        </div>

        <div className="form-group">
          <label>전화번호</label>
          <input
            type="text"
            value={bizPhone}
            onChange={(e) => setBizPhone(formatPhone(e.target.value))}
            maxLength={13}
            disabled={!isOwner}
          />
        </div>

        <div className="form-group">
          <label>휴대전화</label>
          <input
            type="text"
            value={bizMobile}
            onChange={(e) => setBizMobile(formatPhone(e.target.value))}
            maxLength={13}
            disabled={!isOwner}
            required
          />
        </div>

        {error && <div className="login-error">{error}</div>}
        {message && <div className="login-message">{message}</div>}

        {isOwner && (
          <button type="submit" className="btn-submit" disabled={saving}>
            {saving ? '저장 중...' : '저장'}
          </button>
        )}
      </form>
    </div>
  )
}
