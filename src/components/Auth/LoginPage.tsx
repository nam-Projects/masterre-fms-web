import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import { formatBizNo, formatPhone } from '../../utils/format'

export default function LoginPage() {
  const { signIn, signUp } = useAuth()
  const navigate = useNavigate()
  const [isSignUp, setIsSignUp] = useState(false)
  const savedEmail = localStorage.getItem('rememberedEmail')
  const [email, setEmail] = useState(savedEmail || '')
  const [rememberEmail, setRememberEmail] = useState(!!savedEmail)
  const [password, setPassword] = useState('')
  const [bizRegistrationNo, setBizRegistrationNo] = useState('')
  const [bizName, setBizName] = useState('')
  const [bizCeo, setBizCeo] = useState('')
  const [bizAddress, setBizAddress] = useState('')
  const [bizPhone, setBizPhone] = useState('')
  const [bizMobile, setBizMobile] = useState('')
  const [managerName, setManagerName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setMessage('')
    setLoading(true)

    if (isSignUp) {
      // 사업자등록번호 중복 체크
      const { count } = await supabase
        .from('organizations')
        .select('id', { count: 'exact', head: true })
        .eq('biz_registration_no', bizRegistrationNo)
      if (count && count > 0) {
        setError('이미 등록된 사업자등록번호입니다.')
        setLoading(false)
        return
      }

      const { error } = await signUp(email, password, {
        bizRegistrationNo,
        bizName,
        bizCeo,
        bizAddress,
        bizPhone,
        bizMobile,
        managerName,
      })
      if (error) {
        setError(error)
      } else {
        setMessage('가입 확인 이메일을 확인해주세요.')
        setIsSignUp(false)
      }
    } else {
      const { error } = await signIn(email, password)
      if (error) {
        setError(error)
      } else {
        if (rememberEmail) {
          localStorage.setItem('rememberedEmail', email)
        } else {
          localStorage.removeItem('rememberedEmail')
        }
        navigate('/', { replace: true })
      }
    }

    setLoading(false)
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
          <h2>{isSignUp ? '회원가입' : '로그인'}</h2>

          <div className="form-group">
            <label>이메일</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@example.com"
              required
            />
          </div>

          <div className="form-group">
            <label>비밀번호</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="비밀번호"
              required
              minLength={6}
            />
          </div>

          {!isSignUp && (
            <label className="remember-email">
              <input
                type="checkbox"
                checked={rememberEmail}
                onChange={(e) => setRememberEmail(e.target.checked)}
              />
              <span>ID 기억하기</span>
            </label>
          )}

          {isSignUp && (
            <>
              <div className="form-group">
                <label>사업자등록번호</label>
                <input
                  type="text"
                  value={bizRegistrationNo}
                  onChange={(e) => setBizRegistrationNo(formatBizNo(e.target.value))}
                  placeholder="000-00-00000"
                  maxLength={12}
                  required
                />
              </div>
              <div className="form-group">
                <label>상호</label>
                <input
                  type="text"
                  value={bizName}
                  onChange={(e) => setBizName(e.target.value)}
                  placeholder="상호명"
                  required
                />
              </div>
              <div className="form-group">
                <label>대표</label>
                <input
                  type="text"
                  value={bizCeo}
                  onChange={(e) => setBizCeo(e.target.value)}
                  placeholder="대표자명"
                  required
                />
              </div>
              <div className="form-group">
                <label>주소</label>
                <input
                  type="text"
                  value={bizAddress}
                  onChange={(e) => setBizAddress(e.target.value)}
                  placeholder="사업장 주소"
                  required
                />
              </div>
              <div className="form-group">
                <label>전화번호</label>
                <input
                  type="text"
                  value={bizPhone}
                  onChange={(e) => setBizPhone(formatPhone(e.target.value))}
                  placeholder="02-0000-0000"
                  maxLength={13}
                />
              </div>
              <div className="form-group">
                <label>휴대전화</label>
                <input
                  type="text"
                  value={bizMobile}
                  onChange={(e) => setBizMobile(formatPhone(e.target.value))}
                  placeholder="010-0000-0000"
                  maxLength={13}
                  required
                />
              </div>
              <div className="form-group">
                <label>담당자명</label>
                <input
                  type="text"
                  value={managerName}
                  onChange={(e) => setManagerName(e.target.value)}
                  placeholder="담당자 이름"
                  required
                />
              </div>
            </>
          )}

          {error && <div className="login-error">{error}</div>}
          {message && <div className="login-message">{message}</div>}

          <button type="submit" className="btn-submit" disabled={loading}>
            {loading ? '처리 중...' : isSignUp ? '가입' : '로그인'}
          </button>

          <button
            type="button"
            className="btn-toggle-mode"
            onClick={() => {
              setIsSignUp(!isSignUp)
              setError('')
              setMessage('')
            }}
          >
            {isSignUp ? '이미 계정이 있으신가요? 로그인' : '계정이 없으신가요? 회원가입'}
          </button>
        </form>
      </div>
    </div>
  )
}
