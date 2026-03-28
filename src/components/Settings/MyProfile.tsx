import { useState, useEffect } from 'react'
import type { FormEvent } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import { formatPhone } from '../../utils/format'

export default function MyProfile() {
  const { user, profile } = useAuth()

  const [managerName, setManagerName] = useState('')
  const [phone, setPhone] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (profile) {
      setManagerName(profile.managerName || profile.displayName || '')
    }
    // 개인 전화번호 로드
    if (user) {
      supabase
        .from('profiles')
        .select('phone')
        .eq('id', user.id)
        .single()
        .then(({ data }) => {
          if (data?.phone) setPhone(data.phone)
        })
    }
  }, [profile, user])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setMessage('')
    setError('')

    try {
      if (user) {
        await supabase
          .from('profiles')
          .update({
            manager_name: managerName,
            display_name: managerName,
            phone,
          })
          .eq('id', user.id)
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
      <h2>내 정보</h2>
      <form className="profile-settings-form" onSubmit={handleSubmit}>
        <div className="form-group">
          <label>이메일</label>
          <input type="email" value={user?.email || ''} disabled />
        </div>

        <div className="form-group">
          <label>이름</label>
          <input
            type="text"
            value={managerName}
            onChange={(e) => setManagerName(e.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <label>연락처</label>
          <input
            type="text"
            value={phone}
            onChange={(e) => setPhone(formatPhone(e.target.value))}
            placeholder="010-0000-0000"
            maxLength={13}
          />
        </div>

        {error && <div className="login-error">{error}</div>}
        {message && <div className="login-message">{message}</div>}

        <button type="submit" className="btn-submit" disabled={saving}>
          {saving ? '저장 중...' : '저장'}
        </button>
      </form>
    </div>
  )
}
