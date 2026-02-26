import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'

export default function LoginPage() {
  const { signIn, signUp } = useAuth()
  const navigate = useNavigate()
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setMessage('')
    setLoading(true)

    if (isSignUp) {
      const { error } = await signUp(email, password, displayName || email)
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

          {isSignUp && (
            <div className="form-group">
              <label>이름</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="표시 이름"
              />
            </div>
          )}

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
