import { NavLink, useSearchParams } from 'react-router-dom'
import { STAGES, STAGE_LABELS, STAGE_COLORS } from '../../types'
import type { Stage } from '../../types'
import { useStageCounts } from '../../hooks/useStageCounts'
import { useAuth } from '../../contexts/AuthContext'

type Props = {
  onRegisterClick: () => void
}

export default function Sidebar({ onRegisterClick }: Props) {
  const [searchParams, setSearchParams] = useSearchParams()
  const currentFilter = searchParams.get('stage') || 'all'
  const { counts } = useStageCounts()
  const { profile, signOut } = useAuth()

  const handleFilter = (stage: string) => {
    if (stage === 'all') {
      setSearchParams({})
    } else {
      setSearchParams({ stage })
    }
  }

  return (
    <aside className="sidebar">
      <NavLink to="/" className="sidebar-logo">
        <div className="logo-icon">M</div>
        <div className="logo-text">
          <span className="logo-main">MASTER:RE</span>
          <span className="logo-sub">현장관리시스템</span>
        </div>
      </NavLink>

      <button className="btn-register" onClick={onRegisterClick}>
        <span className="btn-register-icon">+</span>
        현장등록
      </button>

      <div className="sidebar-divider" />

      <nav className="sidebar-nav">
        <button
          className={`sidebar-filter ${currentFilter === 'all' ? 'active' : ''}`}
          onClick={() => handleFilter('all')}
        >
          <span className="filter-dot" style={{ background: '#333' }} />
          <span className="filter-label">전체</span>
          <span className="filter-count">{counts.all || 0}</span>
        </button>

        {STAGES.map((s: Stage) => (
          <button
            key={s}
            className={`sidebar-filter ${currentFilter === s ? 'active' : ''}`}
            onClick={() => handleFilter(s)}
          >
            <span
              className="filter-dot"
              style={{ background: STAGE_COLORS[s] }}
            />
            <span className="filter-label">{STAGE_LABELS[s]}</span>
            <span className="filter-count">{counts[s] || 0}</span>
          </button>
        ))}
      </nav>

      <div className="sidebar-divider" />

      <div className="sidebar-user">
        <span className="sidebar-user-name">{profile?.displayName || '사용자'}</span>
        <button className="btn-logout" onClick={signOut}>
          로그아웃
        </button>
      </div>
    </aside>
  )
}
