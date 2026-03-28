import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import RegistrationModal from '../Registration/RegistrationModal'
import { useAuth } from '../../contexts/AuthContext'

export default function Layout() {
  const [modalOpen, setModalOpen] = useState(false)
  const navigate = useNavigate()
  const { profile, orgRole, isSuper, signOut } = useAuth()
  const canEdit = isSuper || orgRole === 'owner' || orgRole === 'manager'

  return (
    <div className="layout">
      <header className="gnb">
        <NavLink to="/" className="gnb-logo">
          <div className="logo-icon">M</div>
          <div className="logo-text">
            <span className="logo-main">MASTER:RE</span>
            <span className="logo-sub">현장관리시스템</span>
          </div>
        </NavLink>
        <div className="gnb-right">
          <span className="gnb-user-name clickable" onClick={() => navigate('/settings/me')}>
            {profile?.displayName || '사용자'}
          </span>
          <button className="btn-logout" onClick={signOut} title="로그아웃">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          </button>
        </div>
      </header>

      <div className="layout-body">
        <Sidebar onRegisterClick={() => setModalOpen(true)} canEdit={canEdit} />
        <main className="main-content">
          <Outlet />
        </main>
      </div>

      {canEdit && (
        <RegistrationModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
        />
      )}
    </div>
  )
}
