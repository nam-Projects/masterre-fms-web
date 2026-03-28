import { useState, useEffect } from 'react'
import type { FormEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

export default function InviteSignUp() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const token = searchParams.get('token') || ''

  const [invite, setInvite] = useState<any>(null)
  const [orgName, setOrgName] = useState('')
  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [managerName, setManagerName] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!token) { setLoading(false); return }
    // 초대 정보 조회
    supabase
      .from('org_invites')
      .select('*')
      .eq('token', token)
      .eq('status', 'pending')
      .single()
      .then(async ({ data }) => {
        if (data) {
          setInvite(data)
          setEmail(data.email)
          // 조직명 별도 조회
          const { data: org } = await supabase
            .from('organizations')
            .select('biz_name')
            .eq('id', data.org_id)
            .single()
          setOrgName(org?.biz_name || '')
        }
        setLoading(false)
      })
  }, [token])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: managerName,
          manager_name: managerName,
          invite_token: token,
        },
      },
    })

    if (error) {
      setError(error.message)
    } else {
      setMessage('가입이 완료되었습니다. 바로 로그인할 수 있습니다.')
    }
    setSubmitting(false)
  }

  if (loading) {
    return (
      <div className="login-page">
        <div className="login-card">
          <p>불러오는 중...</p>
        </div>
      </div>
    )
  }

  if (!invite) {
    return (
      <div className="login-page">
        <div className="login-card">
          <div className="login-logo">
            <div className="logo-icon">M</div>
            <div className="logo-text">
              <span className="logo-main">MASTER:RE</span>
              <span className="logo-sub">현장관리시스템</span>
            </div>
          </div>
          <div className="login-form">
            <h2>초대 링크 오류</h2>
            <p style={{ textAlign: 'center', color: '#888', margin: '16px 0' }}>
              유효하지 않거나 만료된 초대 링크입니다.
            </p>
            <button className="btn-submit" onClick={() => navigate('/login')}>
              로그인으로 이동
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">
          <div className="logo-icon">M</div>
          <div className="logo-text">
            <span className="logo-main">MASTER:RE</span>
            <span className="logo-sub">현장관리시스템</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <h2>초대 가입</h2>
          <p className="invite-org-info">
            <strong>{orgName}</strong> 조직에 초대되었습니다.
          </p>

          <div className="form-group">
            <label>이메일</label>
            <input type="email" value={email} disabled />
          </div>

          <div className="form-group">
            <label>비밀번호</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="비밀번호 (6자 이상)"
              required
              minLength={6}
            />
          </div>

          <div className="form-group">
            <label>이름</label>
            <input
              type="text"
              value={managerName}
              onChange={(e) => setManagerName(e.target.value)}
              placeholder="담당자 이름"
              required
            />
          </div>

          {error && <div className="login-error">{error}</div>}
          {message && <div className="login-message">{message}</div>}

          {!message && (
            <button type="submit" className="btn-submit" disabled={submitting}>
              {submitting ? '처리 중...' : '가입'}
            </button>
          )}

          {message && (
            <button type="button" className="btn-submit" onClick={() => navigate('/login')}>
              로그인으로 이동
            </button>
          )}
        </form>
      </div>
    </div>
  )
}
