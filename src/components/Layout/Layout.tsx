import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import RegistrationModal from '../Registration/RegistrationModal'
import { useAuth } from '../../contexts/AuthContext'

export default function Layout() {
  const [modalOpen, setModalOpen] = useState(false)
  const { profile, signOut } = useAuth()

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
          <span className="gnb-user-name">{profile?.displayName || '사용자'}</span>
          <button className="btn-logout" onClick={signOut}>
            로그아웃
          </button>
        </div>
      </header>

      <div className="layout-body">
        <Sidebar onRegisterClick={() => setModalOpen(true)} />
        <main className="main-content">
          <Outlet />
        </main>
      </div>

      <RegistrationModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
      />
    </div>
  )
}
