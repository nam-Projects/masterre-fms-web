import { useNavigate, useLocation } from 'react-router-dom'
import { STAGES, STAGE_LABELS, STAGE_COLORS } from '../../types'
import type { Stage } from '../../types'
import { useStageCounts } from '../../hooks/useStageCounts'

type Props = {
  onRegisterClick: () => void
  canEdit?: boolean
}

export default function Sidebar({ onRegisterClick, canEdit = true }: Props) {
  const { counts } = useStageCounts()
  const navigate = useNavigate()
  const location = useLocation()
  const currentFilter = new URLSearchParams(location.search).get('stage') || 'all'

  const handleFilter = (stage: string) => {
    if (stage === 'all') {
      navigate('/')
    } else {
      navigate(`/?stage=${stage}`)
    }
  }

  const isSettingsPage = location.pathname.startsWith('/settings')

  return (
    <aside className="sidebar">
      {canEdit && (
        <button className="btn-register" onClick={onRegisterClick}>
          <span className="btn-register-icon">+</span>
          현장등록
        </button>
      )}

      <div className="sidebar-divider" />

      <nav className="sidebar-nav">
        <div className="sidebar-section-label">프로세스 단계</div>
        <button
          className={`sidebar-filter ${currentFilter === 'all' && !isSettingsPage ? 'active' : ''}`}
          onClick={() => handleFilter('all')}
        >
          <span className="filter-dot" style={{ background: '#333' }} />
          <span className="filter-label">전체</span>
          <span className="filter-count">{counts.all || 0}</span>
        </button>

        {STAGES.map((s: Stage) => (
          <button
            key={s}
            className={`sidebar-filter ${currentFilter === s && !isSettingsPage ? 'active' : ''}`}
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

      <nav className="sidebar-nav">
        <div className="sidebar-section-label">설정</div>
        <button
          className={`sidebar-filter ${location.pathname === '/settings/codes' ? 'active' : ''}`}
          onClick={() => navigate('/settings/codes')}
        >
          <span className="filter-dot" style={{ background: '#795548' }} />
          <span className="filter-label">코드관리</span>
        </button>
        <button
          className={`sidebar-filter ${location.pathname === '/settings/guide' ? 'active' : ''}`}
          onClick={() => navigate('/settings/guide')}
        >
          <span className="filter-dot" style={{ background: '#5C6BC0' }} />
          <span className="filter-label">단계 매뉴얼</span>
        </button>
        <button
          className={`sidebar-filter ${location.pathname === '/settings/members' ? 'active' : ''}`}
          onClick={() => navigate('/settings/members')}
        >
          <span className="filter-dot" style={{ background: '#7E57C2' }} />
          <span className="filter-label">직원 관리</span>
        </button>
        <button
          className={`sidebar-filter ${location.pathname === '/settings/profile' ? 'active' : ''}`}
          onClick={() => navigate('/settings/profile')}
        >
          <span className="filter-dot" style={{ background: '#26A69A' }} />
          <span className="filter-label">회사 정보</span>
        </button>
      </nav>

    </aside>
  )
}
